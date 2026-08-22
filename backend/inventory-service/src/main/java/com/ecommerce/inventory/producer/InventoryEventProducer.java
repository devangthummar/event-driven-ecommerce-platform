package com.ecommerce.inventory.producer;

import com.ecommerce.inventory.event.StockReservedEvent;
import com.ecommerce.inventory.event.StockReservationFailedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryEventProducer {

    private static final String INVENTORY_EVENTS_TOPIC = "inventory-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishStockReservedEvent(StockReservedEvent event) {
        log.info("Publishing StockReservedEvent to topic [{}]: orderId={}", INVENTORY_EVENTS_TOPIC, event.getOrderId());
        kafkaTemplate.send(INVENTORY_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }

    public void publishStockReservationFailedEvent(StockReservationFailedEvent event) {
        log.info("Publishing StockReservationFailedEvent to topic [{}]: orderId={}", INVENTORY_EVENTS_TOPIC, event.getOrderId());
        kafkaTemplate.send(INVENTORY_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }

}
