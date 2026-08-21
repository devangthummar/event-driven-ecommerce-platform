package com.ecommerce.inventory.listener;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
public class OrderEventConsumer {

    @KafkaListener(
            topics = "order-events",
            groupId = "inventory-service-group"
    )
    public void handleOrderCreatedEvent(Map<String, Object> event) {
        log.info("Received OrderCreatedEvent:");
        log.info("  eventId={}", event.get("eventId"));
        log.info("  orderId={}", event.get("orderId"));
        log.info("  userId={}", event.get("userId"));
        log.info("  totalAmount={}", event.get("totalAmount"));
        log.info("  createdAt={}", event.get("createdAt"));
    }
}
