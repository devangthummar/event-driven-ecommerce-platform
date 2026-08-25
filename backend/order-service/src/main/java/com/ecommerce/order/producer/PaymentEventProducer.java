package com.ecommerce.order.producer;

import com.ecommerce.order.event.PaymentRequestEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventProducer {

    private static final String PAYMENT_COMMANDS_TOPIC = "payment-commands";

    private final KafkaTemplate<String, PaymentRequestEvent> kafkaTemplate;

    public void publishPaymentRequestEvent(PaymentRequestEvent event) {
        log.info("Publishing PaymentRequestEvent to topic [{}]: orderId={}, amount={}",
                PAYMENT_COMMANDS_TOPIC, event.getOrderId(), event.getAmount());
        kafkaTemplate.send(PAYMENT_COMMANDS_TOPIC, event.getOrderId().toString(), event);
    }

}
