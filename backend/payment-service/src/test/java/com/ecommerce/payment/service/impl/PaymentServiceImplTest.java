package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.dto.request.ProcessPaymentRequest;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.exception.PaymentNotFoundException;
import com.ecommerce.payment.mapper.PaymentMapper;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentMapper paymentMapper;

    @Mock
    private WalletService walletService;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private Payment pendingPayment;
    private Payment successPayment;
    private Payment failedPayment;
    private PaymentResponse pendingPaymentResponse;
    private PaymentResponse successPaymentResponse;
    private PaymentResponse failedPaymentResponse;
    private ProcessPaymentRequest processPaymentRequest;
    private com.ecommerce.payment.entity.Wallet mockWallet;

    private static final String TRANSACTION_ID = "TXN-test-uuid-1234";
    private static final Long ORDER_ID = 1001L;
    private static final Long USER_ID = 1L;
    private static final BigDecimal AMOUNT = new BigDecimal("99.99");

    @BeforeEach
    void setUp() {
        processPaymentRequest = ProcessPaymentRequest.builder()
                .transactionId(TRANSACTION_ID)
                .build();

        pendingPayment = Payment.builder()
                .id(1L)
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TRANSACTION_ID)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        successPayment = Payment.builder()
                .id(1L)
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TRANSACTION_ID)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        failedPayment = Payment.builder()
                .id(1L)
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.FAILED)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TRANSACTION_ID)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        pendingPaymentResponse = PaymentResponse.builder()
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TRANSACTION_ID)
                .build();

        successPaymentResponse = PaymentResponse.builder()
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TRANSACTION_ID)
                .build();

        failedPaymentResponse = PaymentResponse.builder()
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.FAILED)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TRANSACTION_ID)
                .build();

        mockWallet = com.ecommerce.payment.entity.Wallet.builder()
                .id(1L)
                .userId(USER_ID)
                .balance(new BigDecimal("10000.00"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // ─── A. testProcessPayment_Success ────────────────────────────────────

    @Test
    void testProcessPayment_Success() {
        // Arrange
        when(paymentRepository.findByTransactionId(TRANSACTION_ID))
                .thenReturn(Optional.of(pendingPayment));

        when(walletService.deductBalance(USER_ID, AMOUNT))
                .thenReturn(mockWallet);

        when(paymentRepository.save(any(Payment.class)))
                .thenReturn(pendingPayment);

        when(paymentMapper.toPaymentResponse(any(Payment.class)))
                .thenReturn(successPaymentResponse);

        // Act
        PaymentResponse response = paymentService.processPayment(processPaymentRequest);

        // Assert
        assertNotNull(response);
        assertEquals(PaymentStatus.SUCCESS, pendingPayment.getPaymentStatus());

        verify(walletService, times(1)).deductBalance(USER_ID, AMOUNT);
        verify(paymentRepository, times(1)).save(pendingPayment);
        verify(paymentMapper, times(1)).toPaymentResponse(pendingPayment);
    }

    // ─── B. testProcessPayment_InsufficientBalance ────────────────────────

    @Test
    void testProcessPayment_InsufficientBalance() {
        // Arrange
        when(paymentRepository.findByTransactionId(TRANSACTION_ID))
                .thenReturn(Optional.of(pendingPayment));

        when(walletService.deductBalance(USER_ID, AMOUNT))
                .thenThrow(new RuntimeException("Insufficient wallet balance"));

        when(paymentRepository.save(any(Payment.class)))
                .thenReturn(pendingPayment);

        when(paymentMapper.toPaymentResponse(any(Payment.class)))
                .thenReturn(failedPaymentResponse);

        // Act
        PaymentResponse response = paymentService.processPayment(processPaymentRequest);

        // Assert
        assertNotNull(response);
        assertEquals(PaymentStatus.FAILED, pendingPayment.getPaymentStatus());

        verify(walletService, times(1)).deductBalance(USER_ID, AMOUNT);
        verify(paymentRepository, times(1)).save(pendingPayment);
        verify(paymentMapper, times(1)).toPaymentResponse(pendingPayment);
    }

    // ─── C. testProcessPayment_NotFound ───────────────────────────────────

    @Test
    void testProcessPayment_NotFound() {
        // Arrange
        when(paymentRepository.findByTransactionId(TRANSACTION_ID))
                .thenReturn(Optional.empty());

        // Act & Assert
        PaymentNotFoundException exception = assertThrows(
                PaymentNotFoundException.class,
                () -> paymentService.processPayment(processPaymentRequest)
        );

        assertTrue(exception.getMessage().contains(TRANSACTION_ID));

        verify(paymentRepository, times(1)).findByTransactionId(TRANSACTION_ID);
        verify(walletService, never()).deductBalance(anyLong(), any(BigDecimal.class));
        verify(paymentRepository, never()).save(any(Payment.class));
        verify(paymentMapper, never()).toPaymentResponse(any(Payment.class));
    }

    // ─── D. testProcessPayment_AlreadyProcessed ───────────────────────────

    @Test
    void testProcessPayment_AlreadyProcessed() {
        // Arrange
        when(paymentRepository.findByTransactionId(TRANSACTION_ID))
                .thenReturn(Optional.of(successPayment));

        when(paymentMapper.toPaymentResponse(successPayment))
                .thenReturn(successPaymentResponse);

        // Act
        PaymentResponse response = paymentService.processPayment(processPaymentRequest);

        // Assert
        assertNotNull(response);
        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());

        // Idempotency: wallet should never be called for already-processed payments
        verify(walletService, never()).deductBalance(anyLong(), any(BigDecimal.class));
        // Repository save should also not be called (returned early)
        verify(paymentRepository, never()).save(any(Payment.class));
        verify(paymentMapper, times(1)).toPaymentResponse(successPayment);
    }
}
