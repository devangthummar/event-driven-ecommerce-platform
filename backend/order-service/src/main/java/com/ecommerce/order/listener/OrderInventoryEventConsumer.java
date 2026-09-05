package com.ecommerce.order.listener;

import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.event.PaymentRequestEvent;
import com.ecommerce.order.event.StockReservedEvent;
import com.ecommerce.order.event.StockReservedItem;
import com.ecommerce.order.event.StockReservationFailedEvent;
import com.ecommerce.order.exception.OrderNotFoundException;
import com.ecommerce.order.producer.PaymentEventProducer;
import com.ecommerce.order.service.OrderService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderInventoryEventConsumer {

    private final OrderService orderService;
    private final PaymentEventProducer paymentEventProducer;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = "inventory-events",
            groupId = "order-service-group"
    )
    public void handleInventoryEvent(ConsumerRecord<String, String> record) {

        try {
            String json = record.value();
            JsonNode node = objectMapper.readTree(json);

            if (node.has("items") && node.has("totalAmount")) {
                StockReservedEvent reservedEvent = objectMapper.convertValue(node, StockReservedEvent.class);
                handleStockReservedEvent(reservedEvent);
            } else if (node.has("reason")) {
                StockReservationFailedEvent failedEvent = objectMapper.convertValue(node, StockReservationFailedEvent.class);
                handleStockReservationFailedEvent(failedEvent);
            } else {
                log.warn("Received unknown event type from inventory-events topic: {}", json.substring(0, Math.min(200, json.length())));
            }
        } catch (Exception e) {
            log.error("Error deserializing inventory event: {}", e.getMessage(), e);
        }

    }

    private void handleStockReservedEvent(StockReservedEvent event) {

        log.info("Received StockReservedEvent: eventId={}, orderId={}, userId={}, items={}, totalAmount={}, createdAt={}",
                event.getEventId(), event.getOrderId(), event.getUserId(),
                event.getItems() != null ? event.getItems().size() : 0,
                event.getTotalAmount(), event.getCreatedAt());

        try {
            orderService.updateOrderStatus(event.getOrderId(), OrderStatus.PENDING);

            log.info("Order status updated to PENDING for orderId={}", event.getOrderId());

            PaymentRequestEvent paymentRequestEvent = PaymentRequestEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    event.getTotalAmount()
            );
            paymentEventProducer.publishPaymentRequestEvent(paymentRequestEvent);

            log.info("Published PaymentRequestEvent for orderId={}", event.getOrderId());

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
