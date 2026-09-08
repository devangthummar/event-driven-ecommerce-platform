package com.ecommerce.notification.listener;

import com.ecommerce.notification.event.OrderCreatedEvent;
import com.ecommerce.notification.event.OrderEventItem;
import com.ecommerce.notification.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Kafka is at-least-once: a redelivered OrderCreatedEvent carries the same eventId and
 * must not trigger a second confirmation email within this service instance.
 */
@ExtendWith(MockitoExtension.class)
class OrderEventConsumerTest {

    @Mock
    private EmailService emailService;

    private OrderEventConsumer consumer;

    private static final String EVENT_ID = "evt-notification-1";
    private static final Long ORDER_ID = 700L;
    private static final Long USER_ID = 7L;

    @BeforeEach
    void setUp() {
        consumer = new OrderEventConsumer(emailService);
    }

    private OrderCreatedEvent event() {
        return OrderCreatedEvent.builder()
                .eventId(EVENT_ID)
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .totalAmount(new BigDecimal("99.99"))
                .createdAt(LocalDateTime.now())
                .items(List.of(OrderEventItem.builder().productId(1L).quantity(1).build()))
                .build();
    }

    @Test
    void duplicateDelivery_sameEventId_sendsOnlyOneEmail() {
        OrderCreatedEvent event = event();

        consumer.handleOrderCreated(event);
        consumer.handleOrderCreated(event);

        verify(emailService, times(1))
                .sendOrderConfirmationEmail("user" + USER_ID + "@example.com", ORDER_ID,
                        new BigDecimal("99.99"));
    }

    @Test
    void distinctEventsEachSendEmail() {
        OrderCreatedEvent first = event();
        OrderCreatedEvent second = OrderCreatedEvent.builder()
                .eventId("evt-notification-2")
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .totalAmount(new BigDecimal("10.00"))
                .createdAt(LocalDateTime.now())
                .build();

        consumer.handleOrderCreated(first);
        consumer.handleOrderCreated(second);

        verify(emailService, times(2)).sendOrderConfirmationEmail(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.eq(ORDER_ID),
                org.mockito.ArgumentMatchers.any(java.math.BigDecimal.class));
    }

    @Test
    void eventWithoutEventId_isAlwaysProcessed() {
        OrderCreatedEvent noId = OrderCreatedEvent.builder()
                .eventId(null)
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .totalAmount(new BigDecimal("5.00"))
                .createdAt(LocalDateTime.now())
                .build();

        consumer.handleOrderCreated(noId);
        consumer.handleOrderCreated(noId);

        // Cannot be deduplicated; each delivery is processed (documented limitation).
        verify(emailService, times(2)).sendOrderConfirmationEmail(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.eq(ORDER_ID),
                org.mockito.ArgumentMatchers.any(java.math.BigDecimal.class));
    }
}
