package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductRequestDTO {

    @NotBlank(message = "Product name is required.")
    @Size(max = 255, message = "Product name must not exceed 255 characters.")
    private String name;

    private String description;

    @NotNull(message = "Price is required.")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero.")
    private BigDecimal price;

    @Size(max = 100, message = "Category must not exceed 100 characters.")
    private String category;

    @Min(value = 0, message = "Stock quantity must not be negative.")
    private Integer stockQuantity;

    private String imageUrl;
}
