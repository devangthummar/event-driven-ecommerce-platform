package com.ecommerce.inventory.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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

    public static StockReservedEvent of(Long orderId, Long userId, List<StockReservedItem> items) {
        return StockReservedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .orderId(orderId)
                .userId(userId)
                .items(items)
                .createdAt(LocalDateTime.now())
                .build();
    }

}
