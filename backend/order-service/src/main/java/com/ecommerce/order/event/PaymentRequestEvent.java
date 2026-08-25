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
public class PaymentRequestEvent {

    private String eventId;
    private Long orderId;
    private Long userId;
    private BigDecimal amount;
    private String paymentMethod;
    private String eventType;
    private LocalDateTime createdAt;

    public static PaymentRequestEvent of(Long orderId, Long userId, BigDecimal amount) {
        return PaymentRequestEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .orderId(orderId)
                .userId(userId)
                .amount(amount)
                .paymentMethod("WALLET")
                .eventType("PAYMENT_REQUEST")
                .createdAt(LocalDateTime.now())
                .build();
    }

}
