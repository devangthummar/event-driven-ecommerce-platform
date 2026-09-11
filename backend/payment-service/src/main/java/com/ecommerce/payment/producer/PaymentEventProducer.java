package com.ecommerce.payment.producer;

import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.outbox.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventProducer {

    private final OutboxService outboxService;

    public static final String PAYMENT_SUCCESS_EVENTS_TOPIC = "payment-success-events";
    public static final String PAYMENT_FAILED_EVENTS_TOPIC = "payment-failed-events";

    public void publishPaymentSuccessEvent(PaymentSuccessEvent event) {
        String key = String.valueOf(event.getOrderId());
        log.info("Persisting PaymentSuccessEvent to Outbox for asynchronous publication: topic={} for orderId={}, transactionId={}",
                PAYMENT_SUCCESS_EVENTS_TOPIC, event.getOrderId(), event.getTransactionId());
        outboxService.saveToOutbox("PAYMENT", key, "PaymentSuccessEvent",
                PAYMENT_SUCCESS_EVENTS_TOPIC, key, event);
    }

    public void publishPaymentFailedEvent(PaymentFailedEvent event) {
        String key = String.valueOf(event.getOrderId());
        log.info("Persisting PaymentFailedEvent to Outbox for asynchronous publication: topic={} for orderId={}, reason={}",
                PAYMENT_FAILED_EVENTS_TOPIC, event.getOrderId(), event.getReason());
        outboxService.saveToOutbox("PAYMENT", key, "PaymentFailedEvent",
                PAYMENT_FAILED_EVENTS_TOPIC, key, event);
    }
}
