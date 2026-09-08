package com.ecommerce.order.listener;

import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.event.OrderCancelledEvent;
import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.exception.InvalidOrderStateTransitionException;
import com.ecommerce.order.exception.OrderNotFoundException;
import com.ecommerce.order.producer.OrderEventProducer;
import com.ecommerce.order.service.OrderService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderPaymentEventConsumer {

    private final OrderService orderService;
    private final OrderEventProducer orderEventProducer;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = "payment-success-events",
            groupId = "order-service-group"
    )
    public void handlePaymentSuccess(ConsumerRecord<String, String> record) {

        try {
            PaymentSuccessEvent event = objectMapper.readValue(record.value(), PaymentSuccessEvent.class);

            log.info("Received PaymentSuccessEvent: eventId={}, orderId={}, userId={}, transactionId={}, amount={}, createdAt={}",
                    event.getEventId(), event.getOrderId(), event.getUserId(),
                    event.getTransactionId(), event.getAmount(), event.getCreatedAt());

            try {
                orderService.updateOrderStatus(event.getOrderId(), OrderStatus.PAID);

                log.info("Order status updated to PAID for orderId={}", event.getOrderId());

            } catch (OrderNotFoundException e) {
                log.error("Order not found when handling PaymentSuccessEvent: orderId={}, reason={}",
                        event.getOrderId(), e.getMessage());
            } catch (InvalidOrderStateTransitionException e) {
                // A late/duplicate success event for an order that is already CANCELLED
                // (or shipped/delivered) must not resurrect it or move it backwards.
                log.warn("Ignoring late PaymentSuccessEvent for orderId={}: {}",
                        event.getOrderId(), e.getMessage());
            }

            log.info("Finished processing PaymentSuccessEvent: orderId={}", event.getOrderId());

        } catch (Exception e) {
            log.error("Error deserializing PaymentSuccessEvent: {}", e.getMessage(), e);
        }

    }

    @KafkaListener(
            topics = "payment-failed-events",
            groupId = "order-service-group"
    )
    public void handlePaymentFailed(ConsumerRecord<String, String> record) {

        try {
            PaymentFailedEvent event = objectMapper.readValue(record.value(), PaymentFailedEvent.class);

            log.info("Received PaymentFailedEvent: eventId={}, orderId={}, userId={}, amount={}, reason={}, createdAt={}",
                    event.getEventId(), event.getOrderId(), event.getUserId(),
                    event.getAmount(), event.getReason(), event.getCreatedAt());

            try {
                orderService.updateOrderStatus(event.getOrderId(), OrderStatus.CANCELLED);

                log.info("Order status updated to CANCELLED for orderId={}, reason={}",
                        event.getOrderId(), event.getReason());

                // Publish compensation only after the CANCELLED transition was applied.
                // Duplicate failure events (same-state CANCELLED) still publish — the
                // inventory release is idempotent. An order that already left PENDING
                // (e.g. PAID) rejects the transition and is handled below, so a paid
                // order's stock is never released by a stray failure event.
                OrderCancelledEvent orderCancelledEvent = OrderCancelledEvent.of(
                        event.getOrderId(),
                        event.getUserId(),
                        event.getReason()
                );
                orderEventProducer.publishOrderCancelledEvent(orderCancelledEvent);

                log.info("Published OrderCancelledEvent for orderId={}", event.getOrderId());

            } catch (OrderNotFoundException e) {
                log.error("Order not found when handling PaymentFailedEvent: orderId={}, reason={}",
                        event.getOrderId(), e.getMessage());
            } catch (InvalidOrderStateTransitionException e) {
                // Late/duplicate failure event for an order that already left PENDING.
                log.warn("Ignoring late PaymentFailedEvent for orderId={}: {}",
                        event.getOrderId(), e.getMessage());
            }

            log.info("Finished processing PaymentFailedEvent: orderId={}", event.getOrderId());

        } catch (Exception e) {
            log.error("Error deserializing PaymentFailedEvent: {}", e.getMessage(), e);
        }

    }

}
