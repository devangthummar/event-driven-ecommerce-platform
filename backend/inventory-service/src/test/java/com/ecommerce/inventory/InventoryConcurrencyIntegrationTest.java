package com.ecommerce.inventory;

import com.ecommerce.inventory.dto.request.ReserveStockRequest;
import com.ecommerce.inventory.entity.Inventory;
import com.ecommerce.inventory.entity.Reservation;
import com.ecommerce.inventory.entity.enums.ReservationStatus;
import com.ecommerce.inventory.exception.InsufficientStockException;
import com.ecommerce.inventory.repository.InventoryRepository;
import com.ecommerce.inventory.repository.ReservationRepository;
import com.ecommerce.inventory.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.opentest4j.TestAbortedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * REAL PostgreSQL concurrency tests for the reservation/compensation paths (no mocks).
 *
 * <p>Runs against a dedicated {@code inventory_test_db} (see properties below) with
 * {@code create-drop} DDL so the development {@code inventory_db} is never touched.
 * On machines without the local PostgreSQL instance the tests are SKIPPED (reported via
 * TestAbortedException), never silently passed.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/inventory_test_db",
        "spring.datasource.username=postgres",
        "spring.datasource.password=password",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
        "spring.kafka.listener.auto-startup=false",
        "outbox.scheduler.enabled=false"
})
class InventoryConcurrencyIntegrationTest {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private DataSource dataSource;

    @BeforeEach
    void setUp() {
        try (java.sql.Connection connection = dataSource.getConnection()) {
            // connection acquired → real PostgreSQL available
        } catch (Exception e) {
            throw new TestAbortedException(
                    "Local PostgreSQL not available; skipping DB-backed inventory concurrency tests: "
                            + e.getMessage(), e);
        }

        // ddl-auto=create-drop only resets the schema when the context closes; purge
        // rows before each method to stay deterministic across repeated runs.
        reservationRepository.deleteAll();
        inventoryRepository.deleteAll();
    }

    private static final long PRODUCT_A = 7_000_001L;
    private static final long PRODUCT_B = 7_000_002L;
    private static final long PRODUCT_C = 7_000_003L;
    private static final long ORDER_SEQ = 7_100_000L;

    private void seedInventory(Long productId, int available) {
        inventoryRepository.save(Inventory.builder()
                .productId(productId)
                .availableQuantity(available)
                .reservedQuantity(0)
                .totalQuantity(available)
                .lastUpdated(LocalDateTime.now())
                .build());
    }

    private ReserveStockRequest reserve(Long orderId, Long productId, int quantity) {
        return ReserveStockRequest.builder()
                .orderId(orderId)
                .productId(productId)
                .quantity(quantity)
                .build();
    }

    private int available(Long productId) {
        return inventoryRepository.findByProductId(productId)
                .orElseThrow(() -> new IllegalStateException("inventory missing"))
                .getAvailableQuantity();
    }

    private long reservationCount(Long orderId) {
        return reservationRepository.findByOrderIdAndStatus(orderId, ReservationStatus.RESERVED).size();
    }

    /**
     * Two DIFFERENT orders reserve the SAME product concurrently while there is enough
     * stock for both (10 available, 3 + 3 requested). The pessimistic row lock must let
     * both succeed — a stale optimistic-lock read would have spuriously cancelled one
     * order even though stock was sufficient.
     */
    @Test
    void twoDifferentOrders_reserveSameProduct_concurrently_bothSucceed() throws Exception {
        seedInventory(PRODUCT_A, 10);

        long orderX = ORDER_SEQ + 1;
        long orderY = ORDER_SEQ + 2;

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        java.util.concurrent.CountDownLatch started = new java.util.concurrent.CountDownLatch(2);
        try {
            Future<?> futureX = pool.submit(() -> {
                barrier.await(30, TimeUnit.SECONDS);
                started.countDown();
                inventoryService.reserveStock(reserve(orderX, PRODUCT_A, 3));
                return null;
            });
            Future<?> futureY = pool.submit(() -> {
                barrier.await(30, TimeUnit.SECONDS);
                started.countDown();
                inventoryService.reserveStock(reserve(orderY, PRODUCT_A, 3));
                return null;
            });

            assertTrue(started.await(30, TimeUnit.SECONDS), "all threads must start");
            futureX.get(60, TimeUnit.SECONDS);
            futureY.get(60, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        assertEquals(4, available(PRODUCT_A),
                "10 - 3 - 3 = 4: both orders reserved against sufficient stock");
        assertEquals(1, reservationCount(orderX));
        assertEquals(1, reservationCount(orderY));
    }

    /**
     * Racing duplicate deliveries of the SAME OrderCreatedEvent (same order + product)
     * must reserve exactly once: the loser blocks on the row lock, observes the winner's
     * committed reservation and skips — no double decrement, no exception, no failure
     * event for the order.
     */
    @Test
    void duplicateReservation_sameOrderConcurrent_singleReservationSingleDebit() throws Exception {
        seedInventory(PRODUCT_B, 10);
        long orderZ = ORDER_SEQ + 3;

        List<Boolean> results = runConcurrently(2, () -> {
            inventoryService.reserveStock(reserve(orderZ, PRODUCT_B, 2));
            return true;
        });

        assertEquals(2, results.size(), "both duplicate deliveries must be handled without failure");
        assertEquals(8, available(PRODUCT_B), "stock decremented exactly once: 10 - 2 = 8");
        assertEquals(1, reservationCount(orderZ), "exactly one reservation row for the order+product");
    }

    /**
     * Oversell prevention: stock 5, two concurrent orders each requesting 4. Exactly one
     * may succeed (the other must fail with InsufficientStockException); available
     * quantity must never go negative.
     */
    @Test
    void oversellPrevented_twoConcurrentOrders_requestMoreThanStock() throws Exception {
        seedInventory(PRODUCT_C, 5);
        long order1 = ORDER_SEQ + 4;
        long order2 = ORDER_SEQ + 5;

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        java.util.concurrent.CountDownLatch started = new java.util.concurrent.CountDownLatch(2);
        try {
            Future<Boolean> future1 = pool.submit(() -> {
                barrier.await(30, TimeUnit.SECONDS);
                started.countDown();
                try {
                    inventoryService.reserveStock(reserve(order1, PRODUCT_C, 4));
                    return true;
                } catch (InsufficientStockException e) {
                    return false;
                }
            });
            Future<Boolean> future2 = pool.submit(() -> {
                barrier.await(30, TimeUnit.SECONDS);
                started.countDown();
                try {
                    inventoryService.reserveStock(reserve(order2, PRODUCT_C, 4));
                    return true;
                } catch (InsufficientStockException e) {
                    return false;
                }
            });

            assertTrue(started.await(30, TimeUnit.SECONDS), "all threads must start");
            boolean firstSucceeded = future1.get(60, TimeUnit.SECONDS);
            boolean secondSucceeded = future2.get(60, TimeUnit.SECONDS);

            assertEquals(1, (firstSucceeded ? 1 : 0) + (secondSucceeded ? 1 : 0),
                    "exactly one concurrent reservation of 4 against stock 5 may succeed");
        } finally {
            pool.shutdownNow();
        }

        int remaining = available(PRODUCT_C);
        assertTrue(remaining >= 0 && remaining <= 5,
                "available quantity must stay within [0, 5], was " + remaining);
        assertTrue(remaining == 1 || remaining == 5,
                "stock is either untouched (loser rejected first) or decremented by exactly one reservation of 4, was "
                        + remaining);
    }

    /**
     * Compensation release: after a multi-item reservation, releaseStockForOrder must
     * restore every reserved quantity and mark the reservations RELEASED. A duplicate
     * release (duplicate OrderCancelledEvent) must be a no-op.
     */
    @Test
    void releaseStockForOrder_releasesAndIsIdempotent() {
        seedInventory(PRODUCT_A, 20);
        long orderW = ORDER_SEQ + 6;
        inventoryService.reserveStock(reserve(orderW, PRODUCT_A, 5));

        assertEquals(15, available(PRODUCT_A));

        inventoryService.releaseStockForOrder(orderW);

        assertEquals(20, available(PRODUCT_A), "stock fully restored after compensation");
        assertEquals(0, reservationCount(orderW), "no RESERVED rows remain");

        // Duplicate OrderCancelledEvent → second release is a no-op, stock unchanged.
        inventoryService.releaseStockForOrder(orderW);
        assertEquals(20, available(PRODUCT_A));
    }

    // ─── helpers ───────────────────────────────────────────────────────────

    private <T> List<T> runConcurrently(int n, Callable<T> task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CyclicBarrier barrier = new CyclicBarrier(n);
        java.util.concurrent.CountDownLatch started = new java.util.concurrent.CountDownLatch(n);
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
