package com.ecommerce.inventory.listener;

import com.ecommerce.inventory.dto.request.ReserveStockRequest;
import com.ecommerce.inventory.event.OrderCreatedEvent;
import com.ecommerce.inventory.event.OrderEventItem;
import com.ecommerce.inventory.event.StockReservedEvent;
import com.ecommerce.inventory.event.StockReservedItem;
import com.ecommerce.inventory.event.StockReservationFailedEvent;
import com.ecommerce.inventory.producer.InventoryEventProducer;
import com.ecommerce.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final InventoryService inventoryService;
    private final InventoryEventProducer inventoryEventProducer;

    @KafkaListener(
            topics = "order-events",
            groupId = "inventory-service-group"
    )
    public void handleOrderCreatedEvent(OrderCreatedEvent event) {

        log.info("Received OrderCreatedEvent: eventId={}, orderId={}, userId={}, totalAmount={}, createdAt={}",
                event.getEventId(), event.getOrderId(), event.getUserId(),
                event.getTotalAmount(), event.getCreatedAt());

        if (event.getItems() == null || event.getItems().isEmpty()) {
            log.warn("OrderCreatedEvent has no items: orderId={}", event.getOrderId());
            return;
        }

        log.info("Processing {} item(s) for orderId={}", event.getItems().size(), event.getOrderId());

        List<StockReservedItem> reservedItems = new ArrayList<>();
        boolean allSucceeded = true;
        String failureReason = null;

        for (OrderEventItem item : event.getItems()) {

            log.info("Reserving stock: orderId={}, productId={}, quantity={}",
                    event.getOrderId(), item.getProductId(), item.getQuantity());

            try {
                ReserveStockRequest request = ReserveStockRequest.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .build();

                inventoryService.reserveStock(request);

                log.info("Stock reserved successfully: orderId={}, productId={}, quantity={}",
                        event.getOrderId(), item.getProductId(), item.getQuantity());

                reservedItems.add(StockReservedItem.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .build());

            } catch (Exception e) {
                log.error("Failed to reserve stock: orderId={}, productId={}, quantity={}, reason={}",
                        event.getOrderId(), item.getProductId(), item.getQuantity(), e.getMessage());

                allSucceeded = false;
                failureReason = String.format("Failed to reserve stock for productId=%d: %s",
                        item.getProductId(), e.getMessage());
                break;
            }
        }

        if (allSucceeded) {
            StockReservedEvent reservedEvent = StockReservedEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    reservedItems,
                    event.getTotalAmount()
            );

            log.info("All items reserved successfully for orderId={}, publishing StockReservedEvent",
                    event.getOrderId());

            inventoryEventProducer.publishStockReservedEvent(reservedEvent);

        } else {
            StockReservationFailedEvent failedEvent = StockReservationFailedEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    failureReason
            );

            log.info("Stock reservation failed for orderId={}, publishing StockReservationFailedEvent",
                    event.getOrderId());

            inventoryEventProducer.publishStockReservationFailedEvent(failedEvent);
        }

        log.info("Finished processing OrderCreatedEvent: orderId={}", event.getOrderId());
    }
}

