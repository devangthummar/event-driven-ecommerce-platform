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
public class PaymentSuccessEvent {

    private String eventId;
    private Long orderId;
    private Long userId;
    private String transactionId;
    private BigDecimal amount;
    private String eventType;
    private LocalDateTime createdAt;

    public static PaymentSuccessEvent of(Long orderId, Long userId, String transactionId, BigDecimal amount) {
        return PaymentSuccessEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .orderId(orderId)
                .userId(userId)
                .transactionId(transactionId)
                .amount(amount)
                .eventType("PAYMENT_SUCCESS")
                .createdAt(LocalDateTime.now())
                .build();
    }

}
