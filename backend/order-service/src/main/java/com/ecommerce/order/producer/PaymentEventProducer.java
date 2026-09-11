package com.ecommerce.order.producer;

import com.ecommerce.order.event.PaymentRequestEvent;
import com.ecommerce.order.outbox.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventProducer {

    private static final String PAYMENT_COMMANDS_TOPIC = "payment-commands";

    private final OutboxService outboxService;

    public void publishPaymentRequestEvent(PaymentRequestEvent event) {
        log.info("Persisting PaymentRequestEvent to Outbox for asynchronous publication: orderId={}, amount={}",
                event.getOrderId(), event.getAmount());
        outboxService.saveToOutbox("PAYMENT_REQUEST", event.getOrderId().toString(), "PaymentRequestEvent",
                PAYMENT_COMMANDS_TOPIC, event.getOrderId().toString(), event);
    }
}
