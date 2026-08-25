package com.ecommerce.payment.listener;

import com.ecommerce.payment.dto.request.CreatePaymentRequest;
import com.ecommerce.payment.dto.request.ProcessPaymentRequest;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.exception.PaymentNotFoundException;
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
            // Step 1: Create a payment record
            CreatePaymentRequest createRequest = CreatePaymentRequest.builder()
                    .orderId(event.getOrderId())
                    .userId(event.getUserId())
                    .amount(event.getAmount())
                    .paymentMethod(PaymentMethod.valueOf(event.getPaymentMethod()))
                    .build();

            PaymentResponse paymentResponse = paymentService.createPayment(createRequest);
            log.info("Payment created successfully with transactionId={}", paymentResponse.getTransactionId());

            // Step 2: Process the payment (deduct from wallet)
            ProcessPaymentRequest processRequest = ProcessPaymentRequest.builder()
                    .transactionId(paymentResponse.getTransactionId())
                    .build();

            PaymentResponse processedResponse = paymentService.processPayment(processRequest);
            log.info("Payment processed for orderId={}, status={}",
                    event.getOrderId(), processedResponse.getPaymentStatus());

            // Step 3: Publish result event based on payment status
            if (processedResponse.getPaymentStatus() == PaymentStatus.SUCCESS) {
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
                        "Payment processing failed"
                );
                paymentEventProducer.publishPaymentFailedEvent(failedEvent);
            }

        } catch (PaymentNotFoundException e) {
            log.error("Payment not found for orderId={}: {}", event.getOrderId(), e.getMessage());

            PaymentFailedEvent failedEvent = PaymentFailedEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    event.getAmount(),
                    "Payment not found: " + e.getMessage()
            );
            paymentEventProducer.publishPaymentFailedEvent(failedEvent);

        } catch (Exception e) {
            log.error("Unexpected error during payment processing for orderId={}, userId={}: {}",
                    event.getOrderId(), event.getUserId(), e.getMessage(), e);

            PaymentFailedEvent failedEvent = PaymentFailedEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    event.getAmount(),
                    "Unexpected error during payment processing"
            );
            paymentEventProducer.publishPaymentFailedEvent(failedEvent);
        }
    }
}
