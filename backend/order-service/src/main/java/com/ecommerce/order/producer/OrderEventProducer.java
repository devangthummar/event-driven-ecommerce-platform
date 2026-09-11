package com.ecommerce.order.producer;

import com.ecommerce.order.event.OrderCancelledEvent;
import com.ecommerce.order.event.OrderCreatedEvent;
import com.ecommerce.order.outbox.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private static final String ORDER_EVENTS_TOPIC = "order-events";
    private static final String ORDER_CANCELLED_EVENTS_TOPIC = "order-cancelled-events";

    private final OutboxService outboxService;

    public void publishOrderCreatedEvent(OrderCreatedEvent event) {
        log.info("Persisting OrderCreatedEvent to Outbox for asynchronous publication: orderId={}", event.getOrderId());
        outboxService.saveToOutbox("ORDER", event.getOrderId().toString(), "OrderCreatedEvent",
                ORDER_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }

    public void publishOrderCancelledEvent(OrderCancelledEvent event) {
        log.info("Persisting OrderCancelledEvent to Outbox for asynchronous publication: orderId={}", event.getOrderId());
        outboxService.saveToOutbox("ORDER", event.getOrderId().toString(), "OrderCancelledEvent",
                ORDER_CANCELLED_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }
}
