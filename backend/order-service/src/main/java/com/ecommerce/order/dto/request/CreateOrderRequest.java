package com.ecommerce.order.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOrderRequest {

    @NotNull(message = "User ID is required.")
    @Positive(message = "User ID must be a positive number.")
    private Long userId;

    /**
     * Optional idempotency key: a retry with the same key (and same userId) returns the
     * original order instead of creating a duplicate. Absent for legacy callers.
     */
    @Size(max = 64, message = "Idempotency key must not exceed 64 characters.")
    private String idempotencyKey;

    @NotEmpty(message = "Order must contain at least one item.")
    private List<@NotNull(message = "Order item must not be null.") @Valid OrderItemRequest> items;

}