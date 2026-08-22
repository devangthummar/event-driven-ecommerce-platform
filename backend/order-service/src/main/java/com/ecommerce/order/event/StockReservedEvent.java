package com.ecommerce.order.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private LocalDateTime createdAt;

}
