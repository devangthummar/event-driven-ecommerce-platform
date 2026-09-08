package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.exception.PaymentNotFoundException;
import com.ecommerce.payment.exception.InsufficientWalletBalanceException;
import com.ecommerce.payment.mapper.PaymentMapper;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the state-transition logic inside {@link PaymentTransactionService}.
 * Each method here is annotated {@code REQUIRES_NEW} in production; these tests verify
 * the debit-and-settle rules, while the real transaction/concurrency guarantees are
 * proven against PostgreSQL by {@code PaymentConcurrencyIntegrationTest}.
 */
@ExtendWith(MockitoExtension.class)
class PaymentTransactionServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private WalletService walletService;

    @Mock
    private PaymentMapper paymentMapper;

    @InjectMocks
    private PaymentTransactionService paymentTransactionService;

    private static final Long USER_ID = 1L;
    private static final Long ORDER_ID = 1001L;
    private static final BigDecimal AMOUNT = new BigDecimal("80.00");

    private Payment pendingPayment;
    private Payment successPayment;
    private Payment failedPayment;

    @BeforeEach
    void setUp() {
        String txId = "TXN-test-1";
        pendingPayment = Payment.builder()
                .id(1L)
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(txId)
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
                .transactionId(txId)
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
                .transactionId(txId)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PaymentRequestEvent event() {
        return PaymentRequestEvent.builder()
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentMethod("WALLET")
                .build();
    }

    // ─── createAndProcess ──────────────────────────────────────────────────

    @Test
    void createAndProcess_success_debitsWalletOnceAndSettlesSuccess() {
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentMapper.toPaymentResponse(any(Payment.class)))
                .thenAnswer(invocation -> PaymentResponse.builder()
                        .paymentStatus(invocation.<Payment>getArgument(0).getPaymentStatus())
                        .build());

        PaymentResponse response = paymentTransactionService.createAndProcess(event());

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(walletService, times(1)).deductBalance(USER_ID, AMOUNT);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository, times(2)).save(captor.capture());
        assertEquals(PaymentStatus.SUCCESS, captor.getAllValues().get(1).getPaymentStatus());
    }

    @Test
    void createAndProcess_insufficientBalance_marksFailedWithoutSecondDebit() {
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentMapper.toPaymentResponse(any(Payment.class)))
                .thenAnswer(invocation -> PaymentResponse.builder()
                        .paymentStatus(invocation.<Payment>getArgument(0).getPaymentStatus())
                        .build());
        when(walletService.deductBalance(USER_ID, AMOUNT))
                .thenThrow(new InsufficientWalletBalanceException("Insufficient wallet balance."));

        PaymentResponse response = paymentTransactionService.createAndProcess(event());

        assertEquals(PaymentStatus.FAILED, response.getPaymentStatus());
        verify(walletService, times(1)).deductBalance(USER_ID, AMOUNT);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository, times(2)).save(captor.capture());
        assertEquals(PaymentStatus.FAILED, captor.getAllValues().get(1).getPaymentStatus());
    }

    // ─── processPending ────────────────────────────────────────────────────

    @Test
    void processPending_pendingPayment_debitsAndSettlesSuccess() {
        when(paymentRepository.findByTransactionIdForUpdate(any()))
                .thenReturn(Optional.of(pendingPayment));
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentMapper.toPaymentResponse(any(Payment.class)))
                .thenAnswer(invocation -> PaymentResponse.builder()
                        .paymentStatus(invocation.<Payment>getArgument(0).getPaymentStatus())
                        .build());

        PaymentResponse response =
                paymentTransactionService.processPending("TXN-test-1");

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(walletService, times(1)).deductBalance(USER_ID, AMOUNT);
    }

    @Test
    void processPending_alreadySuccess_noSecondDebit() {
        when(paymentRepository.findByTransactionIdForUpdate(any()))
                .thenReturn(Optional.of(successPayment));
        when(paymentMapper.toPaymentResponse(successPayment))
                .thenReturn(PaymentResponse.builder().paymentStatus(PaymentStatus.SUCCESS).build());

        PaymentResponse response =
                paymentTransactionService.processPending("TXN-test-1");

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(walletService, never()).deductBalance(anyLong(), any());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void processPending_notFound_throwsPaymentNotFound() {
        when(paymentRepository.findByTransactionIdForUpdate(any()))
                .thenReturn(Optional.empty());

        assertThrows(PaymentNotFoundException.class,
                () -> paymentTransactionService.processPending("TXN-missing"));
        verify(walletService, never()).deductBalance(anyLong(), any());
    }

    // ─── resolveExisting (unique-constraint loser path) ────────────────────

    @Test
    void resolveExisting_winnerCommittedSuccess_returnsWithoutDebit() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.of(successPayment));
        when(paymentMapper.toPaymentResponse(successPayment))
                .thenReturn(PaymentResponse.builder().paymentStatus(PaymentStatus.SUCCESS).build());

        PaymentResponse response = paymentTransactionService.resolveExisting(ORDER_ID);

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(walletService, never()).deductBalance(anyLong(), any());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void resolveExisting_winnerCommittedFailed_returnsWithoutDebit() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.of(failedPayment));
        when(paymentMapper.toPaymentResponse(failedPayment))
                .thenReturn(PaymentResponse.builder().paymentStatus(PaymentStatus.FAILED).build());

        PaymentResponse response = paymentTransactionService.resolveExisting(ORDER_ID);

        assertEquals(PaymentStatus.FAILED, response.getPaymentStatus());
        verify(walletService, never()).deductBalance(anyLong(), any());
    }

    @Test
    void resolveExisting_stalePending_locksAndSettles() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.of(pendingPayment));
        when(paymentRepository.findByTransactionIdForUpdate("TXN-test-1"))
                .thenReturn(Optional.of(pendingPayment));
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentMapper.toPaymentResponse(any(Payment.class)))
                .thenAnswer(invocation -> PaymentResponse.builder()
                        .paymentStatus(invocation.<Payment>getArgument(0).getPaymentStatus())
                        .build());

        PaymentResponse response = paymentTransactionService.resolveExisting(ORDER_ID);

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(walletService, times(1)).deductBalance(USER_ID, AMOUNT);
    }

    @Test
    void resolveExisting_disappeared_throwsIllegalState() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class,
                () -> paymentTransactionService.resolveExisting(ORDER_ID));
        verify(walletService, never()).deductBalance(anyLong(), any());
    }
}
