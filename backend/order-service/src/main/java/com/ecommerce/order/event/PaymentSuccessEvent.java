package com.ecommerce.order.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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

}
