package com.ecommerce.notification.listener;

import com.ecommerce.notification.event.OrderCreatedEvent;
import com.ecommerce.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    /**
     * Upper bound for the in-memory dedupe set (a few MB of order ids at most). When the
     * bound is exceeded the set is cleared and dedupe restarts — a rare duplicate email
     * is acceptable; unbounded growth is not. The notification service has no database,
     * so a durable outbox-style dedupe would require new infrastructure that this
     * project deliberately avoids.
     */
    private static final int MAX_SEEN_EVENTS = 50_000;

    /**
     * In-memory dedupe of already-processed event deliveries. Kafka is at-least-once: a
     * redelivery of the same OrderCreatedEvent (same eventId) after a consumer restart
     * or rebalance would otherwise send the customer a second confirmation email.
     */
    private final Set<String> seenEventIds = ConcurrentHashMap.newKeySet();

    private final EmailService emailService;

    @KafkaListener(
            topics = "order-events",
            groupId = "notification-service-group"
    )
    public void handleOrderCreated(OrderCreatedEvent event) {

        log.info("Received OrderCreatedEvent: eventId={}, orderId={}, userId={}, totalAmount={}, createdAt={}",
                event.getEventId(), event.getOrderId(), event.getUserId(),
                event.getTotalAmount(), event.getCreatedAt());

        // Deduplicate at-least-once redeliveries. Events without an eventId (hand-crafted
        // messages) cannot be deduplicated and are processed as before.
        if (event.getEventId() != null) {
            if (seenEventIds.size() >= MAX_SEEN_EVENTS) {
                // Memory bound: drop history, accept a possible rare duplicate.
                seenEventIds.clear();
            }
            if (!seenEventIds.add(event.getEventId())) {
                log.info("Duplicate OrderCreatedEvent delivery for orderId={} (eventId={}). "
                        + "Skipping duplicate email.", event.getOrderId(), event.getEventId());
                return;
            }
        }

        // Mocking user email since User Service integration is not yet available
        String userEmail = "user" + event.getUserId() + "@example.com";

        log.info("Sending order confirmation email to={} for orderId={}", userEmail, event.getOrderId());

        emailService.sendOrderConfirmationEmail(userEmail, event.getOrderId(), event.getTotalAmount());

        log.info("Finished processing OrderCreatedEvent: orderId={}", event.getOrderId());
    }

}
