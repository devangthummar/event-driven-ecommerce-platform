package com.ecommerce.payment.listener;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.producer.PaymentEventProducer;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventConsumer {

    private final PaymentService paymentService;
    private final PaymentEventProducer paymentEventProducer;
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "payment-commands", groupId = "payment-service-group")
    public void handlePaymentRequestEvent(ConsumerRecord<String, String> record) {
        try {
            PaymentRequestEvent event = objectMapper.readValue(record.value(), PaymentRequestEvent.class);
            log.info("Received PaymentRequestEvent for orderId={}, userId={}, amount={}",
                    event.getOrderId(), event.getUserId(), event.getAmount());

            // Step 1: Process payment idempotently
            PaymentResponse paymentResponse = paymentService.processPaymentIdempotent(event);
            log.info("Payment processing completed for orderId={}, status={}, transactionId={}",
                    event.getOrderId(), paymentResponse.getPaymentStatus(), paymentResponse.getTransactionId());

            // Step 2: Publish result event based on payment status
            publishOutcome(event, paymentResponse.getPaymentStatus(),
                    paymentResponse.getTransactionId(), null);

        } catch (Exception e) {
            log.error("Unexpected error during payment processing: {}", e.getMessage(), e);

            // Never emit a false PaymentFailedEvent for a payment that already committed
            // SUCCESS. An exception can surface AFTER the payment transaction committed —
            // e.g. the Kafka producer failing while publishing the PaymentSuccessEvent, or
            // an unexpected mapper error — and publishing a failure then would cancel an
            // order whose wallet debit already succeeded. Re-resolve the durable payment
            // row and publish the event that matches its committed state.
            try {
                PaymentRequestEvent event = objectMapper.readValue(record.value(), PaymentRequestEvent.class);

                Optional<Payment> committed = paymentRepository.findByOrderId(event.getOrderId());

                if (committed.isPresent()
                        && committed.get().getPaymentStatus() == PaymentStatus.SUCCESS) {
                    // Payment succeeded and committed; the failure was downstream of the
                    // commit. Retry the success notification instead of cancelling.
                    log.warn("Payment already committed SUCCESS for orderId={} despite a "
                                    + "processing error; republishing PaymentSuccessEvent (no false failure).",
                            event.getOrderId());
                    publishOutcome(event, PaymentStatus.SUCCESS,
                            committed.get().getTransactionId(), null);
                    return;
                }

                // Nothing committed (no row), the row is FAILED, or it is a stale PENDING
                // row (legacy flow) — the failure event accurately reflects that no money
                // was moved, so the order may be cancelled safely.
                publishOutcome(event, PaymentStatus.FAILED, null,
                        "Unexpected error during payment processing: " + e.getMessage());
            } catch (Exception ex) {
                log.error("Failed to publish PaymentFailedEvent: {}", ex.getMessage(), ex);
            }
        }
    }

    /**
     * Publishes the single outcome event that matches a durable payment status, so the
     * same payment can never produce both a SUCCESS and a FAILED event for its order.
     */
    private void publishOutcome(PaymentRequestEvent event, PaymentStatus status,
                                String transactionId, String failureReason) {
        if (status == PaymentStatus.SUCCESS) {
            PaymentSuccessEvent successEvent = PaymentSuccessEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    transactionId,
                    event.getAmount()
            );
            paymentEventProducer.publishPaymentSuccessEvent(successEvent);
        } else {
            String reason = failureReason != null
                    ? failureReason
                    : "Payment processing failed with status: " + status;
            PaymentFailedEvent failedEvent = PaymentFailedEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    event.getAmount(),
                    reason
            );
            paymentEventProducer.publishPaymentFailedEvent(failedEvent);
        }
    }
}
