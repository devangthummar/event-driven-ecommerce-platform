package com.ecommerce.payment.listener;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.producer.PaymentEventProducer;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Consumer-level tests for payment event publishing correctness.
 *
 * <p>Regression target: an exception that surfaces AFTER the payment transaction has
 * committed SUCCESS (e.g. the Kafka producer failing while publishing the success
 * event) must NOT produce a PaymentFailedEvent — that would cancel an order whose
 * wallet debit already succeeded. The consumer must re-resolve the durable payment row
 * and publish the event matching its committed state.
 */
@ExtendWith(MockitoExtension.class)
class PaymentEventConsumerTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private PaymentEventProducer paymentEventProducer;

    @Mock
    private PaymentRepository paymentRepository;

    private ObjectMapper objectMapper;
    private PaymentEventConsumer consumer;

    private static final Long ORDER_ID = 555L;
    private static final Long USER_ID = 44L;
    private static final BigDecimal AMOUNT = new BigDecimal("80.00");
    private static final String TXN_ID = "TXN-consumer-test";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        consumer = new PaymentEventConsumer(
                paymentService, paymentEventProducer, paymentRepository, objectMapper);
    }

    private ConsumerRecord<String, String> record() {
        String json = "{"
                + "\"orderId\":" + ORDER_ID + ","
                + "\"userId\":" + USER_ID + ","
                + "\"amount\":" + AMOUNT + ","
                + "\"paymentMethod\":\"WALLET\","
                + "\"createdAt\":\"2026-01-01T00:00:00\""
                + "}";
        return new ConsumerRecord<>("payment-commands", 0, 0L, "key", json);
    }

    private Payment payment(PaymentStatus status) {
        return Payment.builder()
                .id(1L)
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(status)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TXN_ID)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PaymentResponse response(PaymentStatus status) {
        return PaymentResponse.builder()
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(status)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TXN_ID)
                .build();
    }

    // ─── happy paths ───────────────────────────────────────────────────────

    @Test
    void paymentSuccess_publishesSuccessEvent() {
        when(paymentService.processPaymentIdempotent(any()))
                .thenReturn(response(PaymentStatus.SUCCESS));

        consumer.handlePaymentRequestEvent(record());

        ArgumentCaptor<PaymentSuccessEvent> captor = ArgumentCaptor.forClass(PaymentSuccessEvent.class);
        verify(paymentEventProducer, times(1)).publishPaymentSuccessEvent(captor.capture());
        verify(paymentEventProducer, never()).publishPaymentFailedEvent(any());
        assertEquals(ORDER_ID, captor.getValue().getOrderId());
    }

    @Test
    void paymentFailed_publishesFailedEvent() {
        when(paymentService.processPaymentIdempotent(any()))
                .thenReturn(response(PaymentStatus.FAILED));

        consumer.handlePaymentRequestEvent(record());

        ArgumentCaptor<PaymentFailedEvent> captor = ArgumentCaptor.forClass(PaymentFailedEvent.class);
        verify(paymentEventProducer, times(1)).publishPaymentFailedEvent(captor.capture());
        verify(paymentEventProducer, never()).publishPaymentSuccessEvent(any());
        assertEquals(ORDER_ID, captor.getValue().getOrderId());
    }

    // ─── false-failure regression: exception AFTER committed SUCCESS ───────

    @Test
    void exceptionAfterCommittedSuccess_publishesSuccessNotFailure() {
        when(paymentService.processPaymentIdempotent(any()))
                .thenThrow(new IllegalStateException("Kafka producer unavailable after commit"));
        // The durable row shows the payment already committed SUCCESS.
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.of(payment(PaymentStatus.SUCCESS)));

        consumer.handlePaymentRequestEvent(record());

        // The success event is retried; NO false failure is emitted.
        ArgumentCaptor<PaymentSuccessEvent> captor = ArgumentCaptor.forClass(PaymentSuccessEvent.class);
        verify(paymentEventProducer, times(1)).publishPaymentSuccessEvent(captor.capture());
        verify(paymentEventProducer, never()).publishPaymentFailedEvent(any());
        assertEquals(TXN_ID, captor.getValue().getTransactionId());
    }

    // ─── exception with nothing committed → failure is accurate ────────────

    @Test
    void exceptionWithNoCommittedPayment_publishesFailedEvent() {
        when(paymentService.processPaymentIdempotent(any()))
                .thenThrow(new IllegalStateException("db connection lost"));
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.empty());

        consumer.handlePaymentRequestEvent(record());

        ArgumentCaptor<PaymentFailedEvent> captor = ArgumentCaptor.forClass(PaymentFailedEvent.class);
        verify(paymentEventProducer, times(1)).publishPaymentFailedEvent(captor.capture());
        verify(paymentEventProducer, never()).publishPaymentSuccessEvent(any());
        assertEquals(ORDER_ID, captor.getValue().getOrderId());
    }

    // ─── exception with committed FAILED → failure event is accurate ───────

    @Test
    void exceptionWithCommittedFailed_publishesFailedEvent() {
        when(paymentService.processPaymentIdempotent(any()))
                .thenThrow(new IllegalStateException("event publication failed"));
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.of(payment(PaymentStatus.FAILED)));

        consumer.handlePaymentRequestEvent(record());

        verify(paymentEventProducer, times(1)).publishPaymentFailedEvent(any());
        verify(paymentEventProducer, never()).publishPaymentSuccessEvent(any());
    }

    // ─── deserialization garbage → logged, no event, no crash ──────────────

    @Test
    void malformedRecord_isLoggedAndNeverPublishesEvent() {
        ConsumerRecord<String, String> malformed =
                new ConsumerRecord<>("payment-commands", 0, 0L, "key", "{not json");

        consumer.handlePaymentRequestEvent(malformed);

        verify(paymentService, never()).processPaymentIdempotent(any());
        verify(paymentEventProducer, never()).publishPaymentSuccessEvent(any());
        verify(paymentEventProducer, never()).publishPaymentFailedEvent(any());
    }
}
