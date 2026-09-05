package com.ecommerce.inventory.listener;

import com.ecommerce.inventory.event.OrderCancelledEvent;
import com.ecommerce.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryCancellationConsumer {

    private final InventoryService inventoryService;

    @KafkaListener(
            topics = "order-cancelled-events",
            groupId = "inventory-service-group",
            properties = {"spring.json.value.default.type=com.ecommerce.inventory.event.OrderCancelledEvent"}
    )
    public void handleOrderCancelledEvent(OrderCancelledEvent event) {

        try {
            log.info("Received OrderCancelledEvent: eventId={}, orderId={}, userId={}, reason={}, createdAt={}",
                    event.getEventId(), event.getOrderId(), event.getUserId(),
                    event.getReason(), event.getCreatedAt());

            try {
                inventoryService.releaseStockForOrder(event.getOrderId());
                log.info("Stock release completed for orderId={}", event.getOrderId());
            } catch (Exception e) {
                log.error("Failed to release stock for orderId={}: {}", event.getOrderId(), e.getMessage(), e);
            }

            log.info("Finished processing OrderCancelledEvent: orderId={}", event.getOrderId());

        } catch (Exception e) {
            log.error("Error processing OrderCancelledEvent: {}", e.getMessage(), e);
        }
    }

}
