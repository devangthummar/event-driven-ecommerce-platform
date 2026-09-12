package com.ecommerce.order;

import com.ecommerce.order.dto.request.CreateOrderRequest;
import com.ecommerce.order.dto.request.OrderItemRequest;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.ProductResponse;
import com.ecommerce.order.producer.OrderEventProducer;
import com.ecommerce.order.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.opentest4j.TestAbortedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.client.RestTemplate;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * REAL PostgreSQL tests for order-creation idempotency (no mocks for the database).
 *
 * <p>Runs against a dedicated {@code order_test_db} with {@code create-drop} DDL so the
 * development {@code order_service_db} is never touched. The mocked dependencies are the
 * outbound HTTP client to Product Service and the Kafka event producer (neither service
 * is running in this test); every database operation — the (user_id, idempotency_key)
 * UNIQUE constraint, the replay lookup, the insert race — is exercised against real
 * PostgreSQL.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/order_test_db",
        "spring.datasource.username=postgres",
        "spring.datasource.password=password",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
        "spring.kafka.listener.auto-startup=false",
        "outbox.scheduler.enabled=false"
})
class OrderIdempotencyConcurrencyIntegrationTest {

    @Autowired
    private com.ecommerce.order.service.OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private DataSource dataSource;

    @MockBean
    private RestTemplate restTemplate;

    // Kafka is not running in this unit-style integration test; the producer is mocked
    // so the test focuses on the DATABASE idempotency behaviour. (In production the
    // event publish is async fire-and-forget; DB correctness is what these tests prove.)
    @MockBean
    private OrderEventProducer orderEventProducer;

    @BeforeEach
    void setUp() {
        try (java.sql.Connection connection = dataSource.getConnection()) {
            // connection acquired → real PostgreSQL available
        } catch (Exception e) {
            throw new TestAbortedException(
                    "Local PostgreSQL not available; skipping DB-backed order idempotency tests: "
                            + e.getMessage(), e);
        }

        // ddl-auto=create-drop only resets the schema when the context closes; purge rows
        // before each method to stay deterministic across repeated runs.
        orderRepository.deleteAll();

        ProductResponse product = ProductResponse.builder()
                .id(100L)
                .price(new BigDecimal("100.00"))
                .build();
        when(restTemplate.getForObject(anyString(), eq(ProductResponse.class)))
                .thenReturn(product);
    }

    private static final long USER_A = 5_000_001L;
    private static final long USER_B = 5_000_002L;

    private CreateOrderRequest request(Long userId, String key) {
        return CreateOrderRequest.builder()
                .userId(userId)
                .idempotencyKey(key)
                .items(List.of(
                        OrderItemRequest.builder()
                                .productId(100L)
                                .quantity(1)
                                .build()
                ))
                .build();
    }

    private long countFor(Long userId, String key) {
        return orderRepository.findByUserIdAndIdempotencyKey(userId, key)
                .map(o -> 1L).orElse(0L);
    }

    // ─── concurrent duplicate (same user + key) → exactly one order ────────

    @Test
    void concurrentDuplicateRequests_sameUserAndKey_createExactlyOneOrder() throws Exception {
        int n = 2;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CyclicBarrier barrier = new CyclicBarrier(n);
        java.util.concurrent.CountDownLatch started = new java.util.concurrent.CountDownLatch(n);
        try {
            List<Future<OrderResponse>> futures = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                futures.add(pool.submit(() -> {
                    barrier.await(30, TimeUnit.SECONDS);
                    started.countDown();
                    return orderService.createOrder(request(USER_A, "ck-race-1"));
                }));
            }
            assertTrue(started.await(30, TimeUnit.SECONDS), "all threads must start");
            List<OrderResponse> responses = new ArrayList<>();
            for (Future<OrderResponse> future : futures) {
                responses.add(future.get(60, TimeUnit.SECONDS));
            }

            // No duplicate order may exist, and both callers must observe the SAME order
            // (same orderNumber) — the loser replays the winner instead of failing.
            assertEquals(1, countFor(USER_A, "ck-race-1"),
                    "concurrent duplicates must produce exactly one order row");
            assertEquals(responses.get(0).getOrderNumber(), responses.get(1).getOrderNumber(),
                    "both racing callers must observe the same (single) order");
        } finally {
            pool.shutdownNow();
        }
    }

    // ─── sequential duplicate → replay, still one order, one event source ──

    @Test
    void sequentialDuplicateRequest_returnsOriginalOrder() {
        OrderResponse first = orderService.createOrder(request(USER_A, "ck-seq-1"));
        OrderResponse second = orderService.createOrder(request(USER_A, "ck-seq-1"));

        assertEquals(first.getOrderNumber(), second.getOrderNumber(),
                "a retry with the same key must return the original order");
        assertEquals(1, countFor(USER_A, "ck-seq-1"));
    }

    // ─── same key across DIFFERENT users → two independent orders ──────────

    @Test
    void sameKeyAcrossDifferentUsers_createsIndependentOrders() {
        OrderResponse orderA = orderService.createOrder(request(USER_A, "ck-shared"));
        OrderResponse orderB = orderService.createOrder(request(USER_B, "ck-shared"));

        assertNotEquals(orderA.getOrderNumber(), orderB.getOrderNumber(),
                "the same key must never collide across users");
        assertEquals(1, countFor(USER_A, "ck-shared"));
        assertEquals(1, countFor(USER_B, "ck-shared"));
        assertEquals(2, orderRepository.findAll().size());
    }

    // ─── different keys for the same user → distinct orders ────────────────

    @Test
    void differentKeysForSameUser_createDistinctOrders() {
        OrderResponse order1 = orderService.createOrder(request(USER_A, "ck-distinct-1"));
        OrderResponse order2 = orderService.createOrder(request(USER_A, "ck-distinct-2"));

        assertNotEquals(order1.getOrderNumber(), order2.getOrderNumber());
        assertEquals(2, orderRepository.findAll().size());
    }

    // ─── no key → legacy behavior, duplicate allowed (documented contract) ─

    @Test
    void requestWithoutKey_keepsLegacyNonIdempotentBehavior() {
        CreateOrderRequest noKey = CreateOrderRequest.builder()
                .userId(USER_A)
                .items(List.of(OrderItemRequest.builder().productId(100L).quantity(1).build()))
                .build();

        orderService.createOrder(noKey);
        orderService.createOrder(noKey);

        assertEquals(2, orderRepository.findAll().size(),
                "legacy clients without an idempotency key keep the original contract");
    }
}
