package com.ecommerce.payment.dto.request;

import com.ecommerce.payment.entity.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {

    @NotNull(message = "Order ID is required.")
    @Positive(message = "Order ID must be a positive number.")
    private Long orderId;

    @NotNull(message = "User ID is required.")
    @Positive(message = "User ID must be a positive number.")
    private Long userId;

    @NotNull(message = "Amount is required.")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero.")
    private BigDecimal amount;

    @NotNull(message = "Payment method is required.")
    private PaymentMethod paymentMethod;


}