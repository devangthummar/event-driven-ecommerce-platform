package com.ecommerce.inventory.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockReservationFailedEvent {

    private String eventId;
    private Long orderId;
    private Long userId;
    private String reason;
    private LocalDateTime createdAt;

    public static StockReservationFailedEvent of(Long orderId, Long userId, String reason) {
        return StockReservationFailedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .orderId(orderId)
                .userId(userId)
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build();
    }

}
