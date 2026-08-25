package com.ecommerce.order.producer;

import com.ecommerce.order.event.OrderCancelledEvent;
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
    private static final String ORDER_CANCELLED_EVENTS_TOPIC = "order-cancelled-events";

    private final KafkaTemplate<String, OrderCreatedEvent> orderCreatedKafkaTemplate;
    private final KafkaTemplate<String, OrderCancelledEvent> orderCancelledKafkaTemplate;

    public void publishOrderCreatedEvent(OrderCreatedEvent event) {
        log.info("Publishing OrderCreatedEvent to topic [{}]: orderId={}", ORDER_EVENTS_TOPIC, event.getOrderId());
        orderCreatedKafkaTemplate.send(ORDER_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }

    public void publishOrderCancelledEvent(OrderCancelledEvent event) {
        log.info("Publishing OrderCancelledEvent to topic [{}]: orderId={}", ORDER_CANCELLED_EVENTS_TOPIC, event.getOrderId());
        orderCancelledKafkaTemplate.send(ORDER_CANCELLED_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }
}
