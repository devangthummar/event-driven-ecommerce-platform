package com.ecommerce.inventory.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryResponse {

    private Long productId;

    private Integer availableQuantity;

    private Integer reservedQuantity;

    private Integer totalQuantity;

}