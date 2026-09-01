package com.ecommerce.notification.listener;

import com.ecommerce.notification.event.OrderCreatedEvent;
import com.ecommerce.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final EmailService emailService;

    @KafkaListener(
            topics = "order-events",
            groupId = "notification-service-group"
    )
    public void handleOrderCreated(OrderCreatedEvent event) {

        log.info("Received OrderCreatedEvent: eventId={}, orderId={}, userId={}, totalAmount={}, createdAt={}",
                event.getEventId(), event.getOrderId(), event.getUserId(),
                event.getTotalAmount(), event.getCreatedAt());

        // Mocking user email since User Service integration is not yet available
        String userEmail = "user" + event.getUserId() + "@example.com";

        log.info("Sending order confirmation email to={} for orderId={}", userEmail, event.getOrderId());

        emailService.sendOrderConfirmationEmail(userEmail, event.getOrderId(), event.getTotalAmount());

        log.info("Finished processing OrderCreatedEvent: orderId={}", event.getOrderId());
    }

}
