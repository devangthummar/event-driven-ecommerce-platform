package com.ecommerce.payment.listener;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.producer.PaymentEventProducer;
import com.ecommerce.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventConsumer {

    private final PaymentService paymentService;
    private final PaymentEventProducer paymentEventProducer;

    @KafkaListener(topics = "payment-commands", groupId = "payment-service-group")
    public void handlePaymentRequestEvent(PaymentRequestEvent event) {
        log.info("Received PaymentRequestEvent for orderId={}, userId={}, amount={}",
                event.getOrderId(), event.getUserId(), event.getAmount());

        try {
            // Step 1: Process payment idempotently
            // This handles duplicate detection: if a payment already exists for this orderId
            // with SUCCESS or FAILED status, it returns the existing result without re-processing.
            // If PENDING, it processes the existing record. If not found, it creates and processes.
            PaymentResponse paymentResponse = paymentService.processPaymentIdempotent(event);
            log.info("Payment processing completed for orderId={}, status={}, transactionId={}",
                    event.getOrderId(), paymentResponse.getPaymentStatus(), paymentResponse.getTransactionId());

            // Step 2: Publish result event based on payment status
            if (paymentResponse.getPaymentStatus() == PaymentStatus.SUCCESS) {
                PaymentSuccessEvent successEvent = PaymentSuccessEvent.of(
                        event.getOrderId(),
                        event.getUserId(),
                        paymentResponse.getTransactionId(),
                        event.getAmount()
                );
                paymentEventProducer.publishPaymentSuccessEvent(successEvent);
            } else {
                PaymentFailedEvent failedEvent = PaymentFailedEvent.of(
                        event.getOrderId(),
                        event.getUserId(),
                        event.getAmount(),
                        "Payment processing failed with status: " + paymentResponse.getPaymentStatus()
                );
                paymentEventProducer.publishPaymentFailedEvent(failedEvent);
            }

        } catch (Exception e) {
            // NEVER let exceptions propagate to Kafka — catch everything and publish PaymentFailedEvent
            log.error("Unexpected error during payment processing for orderId={}, userId={}: {}",
                    event.getOrderId(), event.getUserId(), e.getMessage(), e);

            PaymentFailedEvent failedEvent = PaymentFailedEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    event.getAmount(),
                    "Unexpected error during payment processing: " + e.getMessage()
            );
            paymentEventProducer.publishPaymentFailedEvent(failedEvent);
        }
    }
}
