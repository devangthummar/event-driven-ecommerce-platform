package com.ecommerce.order.dto.response;

import com.ecommerce.order.entity.enums.OrderStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {

    /**
     * Database identifier of the order.
     *
     * <p>Exposed additively so clients can address an order resource for the
     * endpoints that are keyed by id (GET /api/v1/orders/{id},
     * PUT /api/v1/orders/{id}/status). Without it a client holding only the
     * order list could not build those requests. No behaviour changes; the field
     * is informational and no authorization decision reads it.
     */
    private Long id;

    private String orderNumber;

    private OrderStatus status;

    private BigDecimal totalAmount;

    private List<OrderItemResponse> items;

    private LocalDateTime createdAt;

}