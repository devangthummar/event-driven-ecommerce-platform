package com.ecommerce.payment.listener;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.producer.PaymentEventProducer;
import com.ecommerce.payment.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventConsumer {

    private final PaymentService paymentService;
    private final PaymentEventProducer paymentEventProducer;
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
            log.error("Unexpected error during payment processing: {}", e.getMessage(), e);
            try {
                PaymentRequestEvent failedEvent = objectMapper.readValue(record.value(), PaymentRequestEvent.class);
                PaymentFailedEvent paymentFailedEvent = PaymentFailedEvent.of(
                        failedEvent.getOrderId(),
                        failedEvent.getUserId(),
                        failedEvent.getAmount(),
                        "Unexpected error during payment processing: " + e.getMessage()
                );
                paymentEventProducer.publishPaymentFailedEvent(paymentFailedEvent);
            } catch (Exception ex) {
                log.error("Failed to publish PaymentFailedEvent: {}", ex.getMessage(), ex);
            }
        }
    }
}
