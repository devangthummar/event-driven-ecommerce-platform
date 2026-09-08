package com.ecommerce.order.listener;

import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.event.OrderCancelledEvent;
import com.ecommerce.order.event.PaymentRequestEvent;
import com.ecommerce.order.event.StockReservedEvent;
import com.ecommerce.order.event.StockReservedItem;
import com.ecommerce.order.event.StockReservationFailedEvent;
import com.ecommerce.order.exception.InvalidOrderStateTransitionException;
import com.ecommerce.order.exception.OrderNotFoundException;
import com.ecommerce.order.producer.OrderEventProducer;
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
    private final OrderEventProducer orderEventProducer;
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

            // Only a successfully applied PENDING transition may start payment. A late
            // StockReservedEvent for an order that is already CANCELLED must NOT trigger
            // a payment request — the transition validation rejects it and throws below.
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
        } catch (InvalidOrderStateTransitionException e) {
            // Out-of-order/late delivery for an order in a terminal state (e.g. already
            // CANCELLED by a reservation failure that raced ahead). Ignore: the saga for
            // this order has already moved past stock reservation.
            log.warn("Ignoring late StockReservedEvent for orderId={}: {}",
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

            // Saga compensation: when reservation of ANY item of a multi-item order
            // failed, items reserved earlier in this order must be released. Inventory
            // releases stock only on OrderCancelledEvent, so this failure path must
            // emit it — otherwise partial reservations leak forever. Duplicate
            // OrderCancelledEvents are safe: inventory release is idempotent. A
            // same-state CANCELLED duplicate is still published (the downstream release
            // is idempotent); an order in any other terminal state rejects the
            // transition and is handled below.
            OrderCancelledEvent orderCancelledEvent = OrderCancelledEvent.of(
                    event.getOrderId(),
                    event.getUserId(),
                    event.getReason()
            );
            orderEventProducer.publishOrderCancelledEvent(orderCancelledEvent);

            log.info("Published OrderCancelledEvent for orderId={} after stock reservation failure",
                    event.getOrderId());

        } catch (OrderNotFoundException e) {
            log.error("Order not found when handling StockReservationFailedEvent: orderId={}, reason={}",
                    event.getOrderId(), e.getMessage());
        } catch (InvalidOrderStateTransitionException e) {
            // Late/duplicate reservation-failure event for an order that already left
            // PENDING (e.g. it was already cancelled, or the payment succeeded). Ignore.
            log.warn("Ignoring late StockReservationFailedEvent for orderId={}: {}",
                    event.getOrderId(), e.getMessage());
        }

        log.info("Finished processing StockReservationFailedEvent: orderId={}", event.getOrderId());

    }

}
