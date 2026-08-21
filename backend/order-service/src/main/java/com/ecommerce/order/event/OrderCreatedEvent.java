package com.ecommerce.order.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCreatedEvent {

    private String eventId;
    private Long orderId;
    private Long userId;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;

    public static OrderCreatedEvent of(Long orderId, Long userId, BigDecimal totalAmount, LocalDateTime createdAt) {
        return OrderCreatedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .orderId(orderId)
                .userId(userId)
                .totalAmount(totalAmount)
                .createdAt(createdAt)
                .build();
    }
}
