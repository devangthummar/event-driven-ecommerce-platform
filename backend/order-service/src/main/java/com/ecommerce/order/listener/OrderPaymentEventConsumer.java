package com.ecommerce.order.listener;

import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.event.OrderCancelledEvent;
import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
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
            }

            log.info("Finished processing PaymentFailedEvent: orderId={}", event.getOrderId());

        } catch (Exception e) {
            log.error("Error deserializing PaymentFailedEvent: {}", e.getMessage(), e);
        }

    }

}
