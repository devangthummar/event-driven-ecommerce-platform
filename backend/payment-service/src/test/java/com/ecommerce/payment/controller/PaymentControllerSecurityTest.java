package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.entity.Wallet;
import com.ecommerce.payment.service.PaymentService;
import com.ecommerce.payment.service.WalletService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Security tests for PaymentController and WalletController authorization.
 *
 * <p>Verifies:
 * <ul>
 *   <li>Users can only access their own wallets and payments</li>
 *   <li>ADMIN can access any wallet or payment</li>
 *   <li>Payment creation/processing require ADMIN (internal Saga operations)</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class PaymentControllerSecurityTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private WalletService walletService;

    @InjectMocks
    private PaymentController paymentController;

    @InjectMocks
    private WalletController walletController;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(Long userId, String role) {
        var authorities = List.of(new SimpleGrantedAuthority(role));
        var details = Map.<String, Object>of("userId", userId, "role", role);
        var authToken = new UsernamePasswordAuthenticationToken(
                "user" + userId + "@example.com", null, authorities);
        authToken.setDetails(details);
        SecurityContextHolder.getContext().setAuthentication(authToken);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Payment endpoints
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getPayment_ownPayment_succeeds() {
        authenticateAs(1L, "ROLE_USER");
        PaymentResponse response = PaymentResponse.builder()
                .orderId(100L)
                .userId(1L)
                .amount(new BigDecimal("50.00"))
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId("TXN-123")
                .build();
        when(paymentService.getPaymentByTransactionId("TXN-123")).thenReturn(response);

        assertDoesNotThrow(() -> paymentController.getPayment("TXN-123"));
    }

    @Test
    void getPayment_otherUsersPayment_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");
        PaymentResponse response = PaymentResponse.builder()
                .orderId(100L)
                .userId(2L)
                .amount(new BigDecimal("50.00"))
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId("TXN-456")
                .build();
        when(paymentService.getPaymentByTransactionId("TXN-456")).thenReturn(response);

        assertThrows(AccessDeniedException.class,
                () -> paymentController.getPayment("TXN-456"));
    }

    @Test
    void getPayment_adminCanAccessAny_succeeds() {
        authenticateAs(1L, "ROLE_ADMIN");
        PaymentResponse response = PaymentResponse.builder()
                .orderId(100L)
                .userId(2L)
                .amount(new BigDecimal("50.00"))
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId("TXN-789")
                .build();
        when(paymentService.getPaymentByTransactionId("TXN-789")).thenReturn(response);

        assertDoesNotThrow(() -> paymentController.getPayment("TXN-789"));
    }

    @Test
    void createPayment_hasPreAuthorizeAnnotation() throws Exception {
        var method = PaymentController.class.getMethod("createPayment",
                com.ecommerce.payment.dto.request.CreatePaymentRequest.class);
        var annotation = method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(annotation, "createPayment must have @PreAuthorize annotation");
        assertEquals("hasRole('ADMIN')", annotation.value());
    }

    @Test
    void processPayment_hasPreAuthorizeAnnotation() throws Exception {
        var method = PaymentController.class.getMethod("processPayment",
                com.ecommerce.payment.dto.request.ProcessPaymentRequest.class);
        var annotation = method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(annotation, "processPayment must have @PreAuthorize annotation");
        assertEquals("hasRole('ADMIN')", annotation.value());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Wallet endpoints
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getWallet_ownWallet_succeeds() {
        authenticateAs(1L, "ROLE_USER");
        Wallet wallet = Wallet.builder()
                .id(1L)
                .userId(1L)
                .balance(new BigDecimal("1000.00"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        when(walletService.getWalletByUserId(1L)).thenReturn(wallet);

        assertDoesNotThrow(() -> walletController.getWallet(1L));
    }

    @Test
    void getWallet_otherUsersWallet_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");

        assertThrows(AccessDeniedException.class,
                () -> walletController.getWallet(2L));
    }

    @Test
    void getWallet_adminCanAccessAny_succeeds() {
        authenticateAs(1L, "ROLE_ADMIN");
        Wallet wallet = Wallet.builder()
                .id(2L)
                .userId(2L)
                .balance(new BigDecimal("500.00"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        when(walletService.getWalletByUserId(2L)).thenReturn(wallet);

        assertDoesNotThrow(() -> walletController.getWallet(2L));
    }

    @Test
    void createWallet_ownWallet_succeeds() {
        authenticateAs(1L, "ROLE_USER");
        Wallet wallet = Wallet.builder()
                .id(1L)
                .userId(1L)
                .balance(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        when(walletService.createWallet(1L)).thenReturn(wallet);

        assertDoesNotThrow(() -> walletController.createWallet(1L));
    }

    @Test
    void createWallet_otherUsersWallet_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");

        assertThrows(AccessDeniedException.class,
                () -> walletController.createWallet(2L));
    }

    @Test
    void addBalance_ownWallet_succeeds() {
        authenticateAs(1L, "ROLE_USER");
        Wallet wallet = Wallet.builder()
                .id(1L)
                .userId(1L)
                .balance(new BigDecimal("1500.00"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        when(walletService.addBalance(eq(1L), any())).thenReturn(wallet);

        assertDoesNotThrow(() -> walletController.addBalance(1L, new BigDecimal("500")));
    }

    @Test
    void addBalance_otherUsersWallet_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");

        assertThrows(AccessDeniedException.class,
                () -> walletController.addBalance(2L, new BigDecimal("500")));
    }
}
