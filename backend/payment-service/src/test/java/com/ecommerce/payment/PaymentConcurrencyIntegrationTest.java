package com.ecommerce.payment;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.Wallet;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.exception.InsufficientWalletBalanceException;
import com.ecommerce.payment.exception.WalletNotFoundException;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.repository.WalletRepository;
import com.ecommerce.payment.service.PaymentService;
import com.ecommerce.payment.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.opentest4j.TestAbortedException;

import javax.sql.DataSource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * REAL PostgreSQL concurrency tests (no mocks, no in-memory DB).
 *
 * <p>Runs against a dedicated {@code payment_test_db} on the local PostgreSQL instance
 * (see datasource properties below). All transactions, row locks, the guarded wallet
 * UPDATE and the UNIQUE(order_id) constraint are exercised exactly as in production.
 *
 * <p>DDL is {@code create-drop} so each context lifecycle gets a clean schema and the
 * development {@code payment_db} is never touched.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/payment_test_db",
        "spring.datasource.username=postgres",
        "spring.datasource.password=password",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
        "spring.kafka.listener.auto-startup=false",
        "outbox.scheduler.enabled=false"
})
class PaymentConcurrencyIntegrationTest {

    @Autowired
    private WalletService walletService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private DataSource dataSource;

    private TransactionTemplate txTemplate;

    @BeforeEach
    void setUp() {
        // These tests need a real PostgreSQL (payment_test_db). On machines without one
        // they are reported as SKIPPED, never silently passed or failed.
        try (java.sql.Connection connection = dataSource.getConnection()) {
            // connection acquired → DB available
        } catch (Exception e) {
            throw new TestAbortedException(
                    "Local PostgreSQL not available; skipping DB-backed concurrency tests: "
                            + e.getMessage(), e);
        }

        // ddl-auto=create-drop only resets the schema when the context closes; test
        // methods share one context, so purge rows before each method to stay
        // deterministic across repeated runs.
        paymentRepository.deleteAll();
        walletRepository.deleteAll();

        // WalletService.deductBalance intentionally runs inside its caller's transaction
        // (in production: the payment REQUIRES_NEW transaction). These tests therefore
        // exercise it inside an explicit transaction, exactly like payment processing.
        txTemplate = new TransactionTemplate(transactionManager);
    }

    private Wallet deductInsideTransaction(Long userId, BigDecimal amount) {
        return txTemplate.execute(status -> walletService.deductBalance(userId, amount));
    }

    // Unique keys per test method so tests never collide inside the shared schema.
    private static final long WALLET_USER_A = 9_000_001L;
    private static final long WALLET_USER_B = 9_000_002L;
    private static final long WALLET_USER_C = 9_000_003L;
    private static final long WALLET_USER_PAID = 9_000_004L;
    private static final long WALLET_USER_TWO_ORDERS = 9_000_005L;
    private static final long WALLET_USER_ADD = 9_000_006L;
    private static final long WALLET_USER_ADD_MISSING = 9_000_007L;
    private static final long ORDER_SEQ = 9_100_000L;

    private static final BigDecimal EIGHTY = new BigDecimal("80.00");

    private void seedWallet(Long userId, BigDecimal balance) {
        walletRepository.save(Wallet.builder()
                .userId(userId)
                .balance(balance)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    private BigDecimal walletBalance(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("wallet missing"))
                .getBalance();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUG #1 — Wallet double-spend
    // ═══════════════════════════════════════════════════════════════════════

    // Scenario A: balance 100, debit 80 → succeeds, final balance 20.
    @Test
    void walletDebit_sufficientBalance_succeedsAndDeducts() {
        seedWallet(WALLET_USER_A, new BigDecimal("100.00"));

        Wallet wallet = deductInsideTransaction(WALLET_USER_A, EIGHTY);

        assertEquals(0, new BigDecimal("20.00").compareTo(wallet.getBalance()));
        assertEquals(0, new BigDecimal("20.00").compareTo(walletBalance(WALLET_USER_A)));
    }

    // Scenario B: balance 50, debit 80 → fails, balance remains 50.
    @Test
    void walletDebit_insufficientBalance_failsAndKeepsBalance() {
        seedWallet(WALLET_USER_B, new BigDecimal("50.00"));

        assertThrows(InsufficientWalletBalanceException.class,
                () -> deductInsideTransaction(WALLET_USER_B, EIGHTY));

        assertEquals(0, new BigDecimal("50.00").compareTo(walletBalance(WALLET_USER_B)));
    }

    // Scenario C: two CONCURRENT debits of 80 against balance 100 → exactly one wins.
    @Test
    void walletDebit_twoConcurrentDebits_onlyOneSucceeds() throws Exception {
        seedWallet(WALLET_USER_C, new BigDecimal("100.00"));

        List<Boolean> results = runConcurrently(2, () -> {
            try {
                txTemplate.execute(status -> {
                    walletService.deductBalance(WALLET_USER_C, EIGHTY);
                    return null;
                });
                return true;
            } catch (InsufficientWalletBalanceException e) {
                return false;
            }
        });

        assertEquals(1, results.stream().filter(Boolean::booleanValue).count(),
                "exactly one concurrent debit must succeed");
        assertEquals(0, new BigDecimal("20.00").compareTo(walletBalance(WALLET_USER_C)),
                "wallet must end at 20, never negative, never double-spent");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUG #10 — Wallet addBalance read-modify-write loss
    // ═══════════════════════════════════════════════════════════════════════

    // Two CONCURRENT top-ups (+80 and +50) against an initial balance of 100 must BOTH
    // be retained → final balance 230. A read-modify-write implementation would let
    // both transactions read 100 and the last writer would overwrite the other's
    // credit, ending at 180 or 150. The atomic SQL UPDATE must serialize them so both
    // additions survive.
    @Test
    void walletAddBalance_twoConcurrentCredits_bothRetained() throws Exception {
        seedWallet(WALLET_USER_ADD, new BigDecimal("100.00"));

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        CountDownLatch started = new CountDownLatch(2);
        try {
            // One thread credits +80, the other +50, released at the same instant so the
            // database genuinely sees two concurrent UPDATEs against the same row.
            Future<?> futurePlus80 = pool.submit(() -> {
                barrier.await(30, TimeUnit.SECONDS);
                started.countDown();
                txTemplate.execute(status -> {
                    walletService.addBalance(WALLET_USER_ADD, new BigDecimal("80.00"));
                    return null;
                });
                return null;
            });
            Future<?> futurePlus50 = pool.submit(() -> {
                barrier.await(30, TimeUnit.SECONDS);
                started.countDown();
                txTemplate.execute(status -> {
                    walletService.addBalance(WALLET_USER_ADD, new BigDecimal("50.00"));
                    return null;
                });
                return null;
            });

            assertTrue(started.await(30, TimeUnit.SECONDS), "all threads must start");
            futurePlus80.get(60, TimeUnit.SECONDS);
            futurePlus50.get(60, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        // Both updates must be retained: a read-modify-write implementation would let
        // both transactions read 100 and the last writer would overwrite the other's
        // credit, ending at 180 or 150 instead of 230.
        assertEquals(0, new BigDecimal("230.00").compareTo(walletBalance(WALLET_USER_ADD)),
                "both concurrent credits must be retained: 100 + 80 + 50 = 230");
    }

    // addBalance against a wallet that does not exist must fail with the domain
    // exception and create nothing.
    @Test
    void walletAddBalance_missingWallet_throwsWalletNotFound() {
        assertThrows(WalletNotFoundException.class,
                () -> txTemplate.execute(status -> {
                    walletService.addBalance(WALLET_USER_ADD_MISSING, EIGHTY);
                    return null;
                }));
        assertTrue(walletRepository.findByUserId(WALLET_USER_ADD_MISSING).isEmpty(),
                "no wallet row may be created by a failed top-up");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUG #3 — Payment unique-constraint race
    // ═══════════════════════════════════════════════════════════════════════

    private PaymentRequestEvent paymentEvent(Long orderId, Long userId, BigDecimal amount) {
        return PaymentRequestEvent.builder()
                .orderId(orderId)
                .userId(userId)
                .amount(amount)
                .paymentMethod(PaymentMethod.WALLET.name())
                .build();
    }

    // Two concurrent identical PaymentRequestEvents: exactly one payment row, wallet
    // debited exactly once, both callers observe SUCCESS (no false failure).
    @Test
    void duplicatePaymentEvent_concurrent_onlyOneDebitNoFalseFailure() throws Exception {
        seedWallet(WALLET_USER_PAID, new BigDecimal("100.00"));
        long orderId = ORDER_SEQ + 1;
        PaymentRequestEvent event = paymentEvent(orderId, WALLET_USER_PAID, EIGHTY);

        List<PaymentStatus> statuses = runConcurrently(2,
                () -> paymentService.processPaymentIdempotent(event).getPaymentStatus());

        // Both callers (winner and the unique-constraint loser) must observe SUCCESS.
        assertEquals(2, statuses.stream().filter(PaymentStatus.SUCCESS::equals).count(),
                "duplicate concurrent processing must not produce a failure");

        // Exactly one payment row for the order ...
        List<Payment> rows = paymentRepository.findByOrderId(orderId)
                .map(List::of).orElse(List.of());
        assertEquals(1, rows.size());
        assertEquals(PaymentStatus.SUCCESS, rows.get(0).getPaymentStatus());

        // ... and exactly one wallet debit.
        assertEquals(0, new BigDecimal("20.00").compareTo(walletBalance(WALLET_USER_PAID)));
    }

    // Sequential duplicate PaymentRequestEvent: second delivery is a no-op.
    @Test
    void duplicatePaymentEvent_sequential_secondDeliveryDoesNotDebit() {
        seedWallet(WALLET_USER_PAID + 1, new BigDecimal("100.00"));
        long orderId = ORDER_SEQ + 2;
        long userId = WALLET_USER_PAID + 1;
        PaymentRequestEvent event = paymentEvent(orderId, userId, EIGHTY);

        PaymentResponse first = paymentService.processPaymentIdempotent(event);
        PaymentResponse second = paymentService.processPaymentIdempotent(event);

        assertEquals(PaymentStatus.SUCCESS, first.getPaymentStatus());
        assertEquals(PaymentStatus.SUCCESS, second.getPaymentStatus());
        assertEquals(0, new BigDecimal("20.00").compareTo(walletBalance(userId)),
                "wallet debited exactly once across sequential duplicates");
        assertEquals(1, paymentRepository.findByOrderId(orderId).map(List::of).orElse(List.of()).size());
    }

    // Two different orders debiting the SAME wallet concurrently: exactly one SUCCESS
    // and one FAILED, single debit (the atomic guarded wallet UPDATE decides the loser).
    @Test
    void twoDifferentOrders_sameWallet_concurrent_onlyOneSucceeds() throws Exception {
        seedWallet(WALLET_USER_TWO_ORDERS, new BigDecimal("100.00"));
        long orderA = ORDER_SEQ + 3;
        long orderB = ORDER_SEQ + 4;

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        CountDownLatch started = new CountDownLatch(2);
        try {
            Future<PaymentStatus> futureA = pool.submit(() -> {
                barrier.await(30, TimeUnit.SECONDS);
                started.countDown();
                return paymentService.processPaymentIdempotent(
                        paymentEvent(orderA, WALLET_USER_TWO_ORDERS, EIGHTY))
                        .getPaymentStatus();
            });
            Future<PaymentStatus> futureB = pool.submit(() -> {
                barrier.await(30, TimeUnit.SECONDS);
                started.countDown();
                return paymentService.processPaymentIdempotent(
                        paymentEvent(orderB, WALLET_USER_TWO_ORDERS, EIGHTY))
                        .getPaymentStatus();
            });

            assertTrue(started.await(30, TimeUnit.SECONDS), "all threads must start");
            PaymentStatus statusA = futureA.get(60, TimeUnit.SECONDS);
            PaymentStatus statusB = futureB.get(60, TimeUnit.SECONDS);

            assertEquals(1,
                    List.of(statusA, statusB).stream().filter(PaymentStatus.SUCCESS::equals).count(),
                    "exactly one order may succeed against a 100-balance wallet");
            assertEquals(1,
                    List.of(statusA, statusB).stream().filter(PaymentStatus.FAILED::equals).count(),
                    "the other order must be FAILED (insufficient balance)");
            assertEquals(0, new BigDecimal("20.00").compareTo(walletBalance(WALLET_USER_TWO_ORDERS)),
                    "wallet debited exactly once across both orders");
        } finally {
            pool.shutdownNow();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // helpers
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Runs {@code n} identical tasks on separate threads, releasing them at the same
     * instant via a barrier so the database genuinely sees concurrent transactions.
     */
    private <T> List<T> runConcurrently(int n, Callable<T> task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CyclicBarrier barrier = new CyclicBarrier(n);
        CountDownLatch started = new CountDownLatch(n);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                futures.add(pool.submit(() -> {
                    barrier.await(30, TimeUnit.SECONDS);
                    started.countDown();
                    return task.call();
                }));
            }
            assertTrue(started.await(30, TimeUnit.SECONDS), "all threads must start");
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) {
                results.add(future.get(60, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }
}
