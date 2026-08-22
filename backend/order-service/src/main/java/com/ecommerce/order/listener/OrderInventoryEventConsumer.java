package com.ecommerce.order.listener;

import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.event.StockReservedEvent;
import com.ecommerce.order.event.StockReservationFailedEvent;
import com.ecommerce.order.exception.OrderNotFoundException;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderInventoryEventConsumer {

    private final OrderService orderService;

    @KafkaListener(
            topics = "inventory-events",
            groupId = "order-service-group"
    )
    public void handleInventoryEvent(Object event) {

        if (event instanceof StockReservedEvent reservedEvent) {
            handleStockReservedEvent(reservedEvent);
        } else if (event instanceof StockReservationFailedEvent failedEvent) {
            handleStockReservationFailedEvent(failedEvent);
        } else {
            log.warn("Received unknown event type: {}", event.getClass().getSimpleName());
        }

    }

    private void handleStockReservedEvent(StockReservedEvent event) {

        log.info("Received StockReservedEvent: eventId={}, orderId={}, userId={}, items={}, createdAt={}",
                event.getEventId(), event.getOrderId(), event.getUserId(),
                event.getItems() != null ? event.getItems().size() : 0,
                event.getCreatedAt());

        try {
            orderService.updateOrderStatus(event.getOrderId(), OrderStatus.PENDING);

            log.info("Order status updated to PENDING for orderId={}", event.getOrderId());

        } catch (OrderNotFoundException e) {
            log.error("Order not found when handling StockReservedEvent: orderId={}, reason={}",
                    event.getOrderId(), e.getMessage());
        }

        log.info("Finished processing StockReservedEvent: orderId={}", event.getOrderId());

    }

    private void handleStockReservationFailedEvent(StockReservationFailedEvent event) {

        log.info("Received StockReservationFailedEvent: eventId={}, orderId={}, userId={}, reason={}, createdAt={}",
                event.getEventId(), event.getOrderId(), event.getUserId(),
                event.getReason(), event.getCreatedAt());

        try {
            orderService.updateOrderStatus(event.getOrderId(), OrderStatus.CANCELLED);

            log.info("Order status updated to CANCELLED for orderId={}, reason={}",
                    event.getOrderId(), event.getReason());

        } catch (OrderNotFoundException e) {
            log.error("Order not found when handling StockReservationFailedEvent: orderId={}, reason={}",
                    event.getOrderId(), e.getMessage());
        }

        log.info("Finished processing StockReservationFailedEvent: orderId={}", event.getOrderId());

    }

}
