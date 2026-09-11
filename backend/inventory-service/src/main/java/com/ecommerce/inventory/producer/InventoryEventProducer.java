package com.ecommerce.inventory.producer;

import com.ecommerce.inventory.event.StockReservedEvent;
import com.ecommerce.inventory.event.StockReservationFailedEvent;
import com.ecommerce.inventory.outbox.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryEventProducer {

    private static final String INVENTORY_EVENTS_TOPIC = "inventory-events";

    private final OutboxService outboxService;

    public void publishStockReservedEvent(StockReservedEvent event) {
        log.info("Persisting StockReservedEvent to Outbox for asynchronous publication: orderId={}", event.getOrderId());
        outboxService.saveToOutbox("INVENTORY", event.getOrderId().toString(), "StockReservedEvent",
                INVENTORY_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }

    public void publishStockReservationFailedEvent(StockReservationFailedEvent event) {
        log.info("Persisting StockReservationFailedEvent to Outbox for asynchronous publication: orderId={}", event.getOrderId());
        outboxService.saveToOutbox("INVENTORY", event.getOrderId().toString(), "StockReservationFailedEvent",
                INVENTORY_EVENTS_TOPIC, event.getOrderId().toString(), event);
    }

}
