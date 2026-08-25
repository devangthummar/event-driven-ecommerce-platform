package com.ecommerce.payment.producer;

import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public static final String PAYMENT_SUCCESS_EVENTS_TOPIC = "payment-success-events";
    public static final String PAYMENT_FAILED_EVENTS_TOPIC = "payment-failed-events";

    public void publishPaymentSuccessEvent(PaymentSuccessEvent event) {
        String key = String.valueOf(event.getOrderId());
        log.info("Publishing PaymentSuccessEvent to topic={} for orderId={}, transactionId={}",
                PAYMENT_SUCCESS_EVENTS_TOPIC, event.getOrderId(), event.getTransactionId());
        kafkaTemplate.send(PAYMENT_SUCCESS_EVENTS_TOPIC, key, event);
    }

    public void publishPaymentFailedEvent(PaymentFailedEvent event) {
        String key = String.valueOf(event.getOrderId());
        log.info("Publishing PaymentFailedEvent to topic={} for orderId={}, reason={}",
                PAYMENT_FAILED_EVENTS_TOPIC, event.getOrderId(), event.getReason());
        kafkaTemplate.send(PAYMENT_FAILED_EVENTS_TOPIC, key, event);
    }
}
