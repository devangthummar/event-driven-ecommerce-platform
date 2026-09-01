package com.ecommerce.product.dto.response;

import lombok.Builder;
import lombok.Data;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ProductResponseDTO implements Serializable {
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private String category;
    private Integer stockQuantity;
    private String imageUrl;
    private Double averageRating;
    private LocalDateTime createdAt;
}