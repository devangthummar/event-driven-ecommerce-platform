package com.ecommerce.payment.event;

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
public class PaymentFailedEvent {

    private String eventId;
    private Long orderId;
    private Long userId;
    private BigDecimal amount;
    private String reason;
    private String eventType;
    private LocalDateTime createdAt;

    public static PaymentFailedEvent of(Long orderId, Long userId, BigDecimal amount, String reason) {
        return PaymentFailedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .orderId(orderId)
                .userId(userId)
                .amount(amount)
                .reason(reason)
                .eventType("PAYMENT_FAILED")
                .createdAt(LocalDateTime.now())
                .build();
    }
}
