package com.ecommerce.order.listener;

import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.producer.OrderEventProducer;
import com.ecommerce.order.producer.PaymentEventProducer;
import com.ecommerce.order.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Verifies that a StockReservationFailedEvent cancels the order AND emits
 * OrderCancelledEvent so Inventory releases any items reserved earlier in the order
 * (Saga compensation for multi-item orders).
 */
@ExtendWith(MockitoExtension.class)
class OrderInventoryEventConsumerTest {

    @Mock
    private OrderService orderService;

    @Mock
    private PaymentEventProducer paymentEventProducer;

    @Mock
    private OrderEventProducer orderEventProducer;

    private ObjectMapper objectMapper;
    private OrderInventoryEventConsumer consumer;

    private static final Long ORDER_ID = 777L;
    private static final Long USER_ID = 42L;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        consumer = new OrderInventoryEventConsumer(
                orderService, paymentEventProducer, orderEventProducer, objectMapper);
    }

    private ConsumerRecord<String, String> record(String json) {
        return new ConsumerRecord<>("inventory-events", 0, 0L, "key", json);
    }

    // ─── Stock reservation failure → cancel + publish OrderCancelledEvent ──

    @Test
    void stockReservationFailed_cancelsOrderAndPublishesOrderCancelledEvent() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-1\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"reason\":\"Failed to reserve stock for productId=200: Reserved quantity is insufficient.\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        consumer.handleInventoryEvent(record(json));

        verify(orderService, times(1))
                .updateOrderStatus(ORDER_ID, OrderStatus.CANCELLED);
        verify(orderEventProducer, times(1))
                .publishOrderCancelledEvent(any());
        verify(paymentEventProducer, never())
                .publishPaymentRequestEvent(any());
    }

    // ─── Duplicate failure events → compensation stays safe (publish is idempotent
    //      downstream: Inventory release filters RESERVED-only reservations) ──

    @Test
    void duplicateStockReservationFailedEvents_areSafeAndRepeatable() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-1\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"reason\":\"Failed to reserve stock\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        consumer.handleInventoryEvent(record(json));
        consumer.handleInventoryEvent(record(json));

        verify(orderService, times(2))
                .updateOrderStatus(ORDER_ID, OrderStatus.CANCELLED);
        // Inventory dedupes: releaseStockForOrder only touches RESERVED rows, so a
        // second OrderCancelledEvent cannot double-release.
        verify(orderEventProducer, times(2))
                .publishOrderCancelledEvent(any());
        verify(paymentEventProducer, never())
                .publishPaymentRequestEvent(any());
    }

    // ─── Late StockReservedEvent for an order that already left PENDING (e.g. it was
    //      cancelled by a racing failure) → transition rejected, NO payment request ──

    @Test
    void stockReserved_whenOrderAlreadyCancelled_doesNotPublishPaymentRequest() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-4\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"items\":[{\"productId\":1,\"quantity\":1}],"
                + "\"totalAmount\":100.00,"
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        org.mockito.Mockito.doThrow(
                        new com.ecommerce.order.exception.InvalidOrderStateTransitionException(
                                "Invalid order state transition from CANCELLED to PENDING"))
                .when(orderService).updateOrderStatus(eq(ORDER_ID), eq(OrderStatus.PENDING));

        consumer.handleInventoryEvent(record(json));

        // A cancelled order must never start payment.
        verify(paymentEventProducer, never())
                .publishPaymentRequestEvent(any());
        verify(orderEventProducer, never())
                .publishOrderCancelledEvent(any());
    }

    // ─── Stock reserved (success) → PENDING + PaymentRequestEvent, no cancelled ──

    @Test
    void stockReserved_publishesPaymentRequest_andNoCancellation() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-2\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"items\":[{\"productId\":1,\"quantity\":1}],"
                + "\"totalAmount\":100.00,"
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        consumer.handleInventoryEvent(record(json));

        verify(orderService, times(1))
                .updateOrderStatus(ORDER_ID, OrderStatus.PENDING);
        verify(paymentEventProducer, times(1))
                .publishPaymentRequestEvent(any());
        verify(orderEventProducer, never())
                .publishOrderCancelledEvent(any());
    }

    // ─── Missing order → OrderNotFoundException swallowed, no publish ──────

    @Test
    void stockReservationFailed_whenOrderMissing_doesNotPublishCancelled() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-3\","
                + "\"orderId\":999999,"
                + "\"userId\":" + USER_ID + ","
                + "\"reason\":\"Failed to reserve stock\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        org.mockito.Mockito.doThrow(
                        new com.ecommerce.order.exception.OrderNotFoundException("not found"))
                .when(orderService).updateOrderStatus(eq(999999L), eq(OrderStatus.CANCELLED));

        consumer.handleInventoryEvent(record(json));

        verify(orderEventProducer, never())
                .publishOrderCancelledEvent(any());
    }
}
