package com.ecommerce.order.producer;

import com.ecommerce.order.event.OrderCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private static final String ORDER_EVENTS_TOPIC = "order-events";

    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    public void publishOrderCreatedEvent(OrderCreatedEvent event) {
        log.info("Publishing OrderCreatedEvent to topic [{}]: orderId={}", ORDER_EVENTS_TOPIC, event.getOrderId());
        kafkaTemplate.send(ORDER_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }
}
