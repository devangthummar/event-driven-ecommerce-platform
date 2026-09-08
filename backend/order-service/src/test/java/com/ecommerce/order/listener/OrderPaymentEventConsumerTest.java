package com.ecommerce.order.listener;

import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.producer.OrderEventProducer;
import com.ecommerce.order.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Regression coverage: the payment-failure Saga compensation path (cancel order +
 * publish OrderCancelledEvent → inventory releases reserved stock) must keep working
 * unchanged, and payment success must not trigger cancellation.
 */
@ExtendWith(MockitoExtension.class)
class OrderPaymentEventConsumerTest {

    @Mock
    private OrderService orderService;

    @Mock
    private OrderEventProducer orderEventProducer;

    private ObjectMapper objectMapper;
    private OrderPaymentEventConsumer consumer;

    private static final Long ORDER_ID = 888L;
    private static final Long USER_ID = 43L;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        consumer = new OrderPaymentEventConsumer(orderService, orderEventProducer, objectMapper);
    }

    private ConsumerRecord<String, String> record(String json) {
        return new ConsumerRecord<>("payment-events", 0, 0L, "key", json);
    }

    // ─── Payment failure → CANCELLED + OrderCancelledEvent (stock release) ──

    @Test
    void paymentFailed_cancelsOrderAndPublishesOrderCancelledEvent() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-pf-1\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"amount\":80.00,"
                + "\"reason\":\"Insufficient wallet balance\","
                + "\"eventType\":\"PAYMENT_FAILED\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        consumer.handlePaymentFailed(record(json));

        verify(orderService, times(1))
                .updateOrderStatus(ORDER_ID, OrderStatus.CANCELLED);
        verify(orderEventProducer, times(1))
                .publishOrderCancelledEvent(org.mockito.ArgumentMatchers.any());
    }

    // ─── Duplicate payment failures remain safe (release is idempotent) ─────

    @Test
    void duplicatePaymentFailedEvents_remainSafe() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-pf-2\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"amount\":80.00,"
                + "\"reason\":\"Insufficient wallet balance\","
                + "\"eventType\":\"PAYMENT_FAILED\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        consumer.handlePaymentFailed(record(json));
        consumer.handlePaymentFailed(record(json));

        verify(orderService, times(2))
                .updateOrderStatus(ORDER_ID, OrderStatus.CANCELLED);
        verify(orderEventProducer, times(2))
                .publishOrderCancelledEvent(org.mockito.ArgumentMatchers.any());
    }

    // ─── Late PaymentSuccessEvent for an already-CANCELLED order is ignored (the
    //      terminal state is never reversed; no payment flow is started) ──────────

    @Test
    void paymentSuccess_whenOrderAlreadyCancelled_isIgnored() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-ps-late\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"transactionId\":\"TXN-1\","
                + "\"amount\":80.00,"
                + "\"eventType\":\"PAYMENT_SUCCESS\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        org.mockito.Mockito.doThrow(
                        new com.ecommerce.order.exception.InvalidOrderStateTransitionException(
                                "Invalid order state transition from CANCELLED to PAID"))
                .when(orderService).updateOrderStatus(eq(ORDER_ID), eq(OrderStatus.PAID));

        consumer.handlePaymentSuccess(record(json));

        // A cancelled order must not be resurrected to PAID.
        verify(orderEventProducer, never())
                .publishOrderCancelledEvent(org.mockito.ArgumentMatchers.any());
    }

    // ─── Late PaymentFailedEvent for an already-PAID order: no compensation publish ──

    @Test
    void paymentFailed_whenOrderAlreadyPaid_doesNotPublishCancellation() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-pf-late\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"amount\":80.00,"
                + "\"reason\":\"Insufficient wallet balance\","
                + "\"eventType\":\"PAYMENT_FAILED\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        org.mockito.Mockito.doThrow(
                        new com.ecommerce.order.exception.InvalidOrderStateTransitionException(
                                "Invalid order state transition from PAID to CANCELLED"))
                .when(orderService).updateOrderStatus(eq(ORDER_ID), eq(OrderStatus.CANCELLED));

        consumer.handlePaymentFailed(record(json));

        // A paid order's reserved stock must never be released by a stray failure event.
        verify(orderEventProducer, never())
                .publishOrderCancelledEvent(org.mockito.ArgumentMatchers.any());
    }

    // ─── Payment success → PAID, never cancelled ───────────────────────────

    @Test
    void paymentSuccess_marksPaid_andDoesNotCancel() throws Exception {
        String json = "{"
                + "\"eventId\":\"evt-ps-1\","
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"transactionId\":\"TXN-1\","
                + "\"amount\":80.00,"
                + "\"eventType\":\"PAYMENT_SUCCESS\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";

        consumer.handlePaymentSuccess(record(json));

        verify(orderService, times(1))
                .updateOrderStatus(ORDER_ID, OrderStatus.PAID);
        verify(orderEventProducer, never())
                .publishOrderCancelledEvent(org.mockito.ArgumentMatchers.any());
    }
}
