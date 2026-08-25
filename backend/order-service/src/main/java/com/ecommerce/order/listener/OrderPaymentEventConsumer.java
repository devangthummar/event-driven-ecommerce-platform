package com.ecommerce.order.listener;

import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.exception.OrderNotFoundException;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderPaymentEventConsumer {

    private final OrderService orderService;

    @KafkaListener(
            topics = "payment-success-events",
            groupId = "order-service-group"
    )
    public void handlePaymentSuccess(PaymentSuccessEvent event) {

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

    }

    @KafkaListener(
            topics = "payment-failed-events",
            groupId = "order-service-group"
    )
    public void handlePaymentFailed(PaymentFailedEvent event) {

        log.info("Received PaymentFailedEvent: eventId={}, orderId={}, userId={}, amount={}, reason={}, createdAt={}",
                event.getEventId(), event.getOrderId(), event.getUserId(),
                event.getAmount(), event.getReason(), event.getCreatedAt());

        try {
            orderService.updateOrderStatus(event.getOrderId(), OrderStatus.CANCELLED);

            log.info("Order status updated to CANCELLED for orderId={}, reason={}",
                    event.getOrderId(), event.getReason());

        } catch (OrderNotFoundException e) {
            log.error("Order not found when handling PaymentFailedEvent: orderId={}, reason={}",
                    event.getOrderId(), e.getMessage());
        }

        log.info("Finished processing PaymentFailedEvent: orderId={}", event.getOrderId());

    }

}
