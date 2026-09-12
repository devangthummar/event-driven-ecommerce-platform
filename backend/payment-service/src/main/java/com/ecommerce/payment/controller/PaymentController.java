package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.request.CreatePaymentRequest;
import com.ecommerce.payment.dto.request.ProcessPaymentRequest;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getDetails() == null) return null;
        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) auth.getDetails();
        return (Long) details.get("userId");
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    /**
     * Creates a payment record. Administrative/internal operation — requires ADMIN role.
     * The normal Saga flow creates payments via Kafka consumers calling the service layer.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PaymentResponse> createPayment(
            @Valid @RequestBody CreatePaymentRequest request) {

        PaymentResponse response = paymentService.createPayment(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    /**
     * Retrieves payment details. Users can only access their own payments; ADMIN can access any.
     */
    @GetMapping("/{transactionId}")
    public ResponseEntity<PaymentResponse> getPayment(
            @PathVariable String transactionId) {

        PaymentResponse response =
                paymentService.getPaymentByTransactionId(transactionId);

        // Ownership check: the authenticated user must match the payment's userId.
        if (!isAdmin()) {
            Long uid = currentUserId();
            if (uid == null || !uid.equals(response.getUserId())) {
                throw new AccessDeniedException(
                        "You do not have permission to access this payment.");
            }
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Processes an existing payment. Administrative/internal operation — requires ADMIN role.
     * The normal Saga flow processes payments via Kafka consumers calling the service layer.
     */
    @PostMapping("/process")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PaymentResponse> processPayment(
            @Valid @RequestBody ProcessPaymentRequest request) {

        PaymentResponse response =
                paymentService.processPayment(request);

        return ResponseEntity.ok(response);
    }
}