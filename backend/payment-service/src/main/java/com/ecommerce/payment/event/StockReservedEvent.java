package com.ecommerce.payment.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockReservedEvent {

    private String eventId;
    private Long orderId;
    private Long userId;
    private List<StockReservedItem> items;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
}
