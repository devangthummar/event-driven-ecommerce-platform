package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.dto.request.ProcessPaymentRequest;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.mapper.PaymentMapper;
import com.ecommerce.payment.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the {@link PaymentServiceImpl} idempotency ORCHESTRATOR. All state
 * mutations live in {@link PaymentTransactionService} (mock here); its transactional
 * step logic is covered by {@link PaymentTransactionServiceTest}, and real PostgreSQL
 * concurrency behavior is covered by the DB-backed integration test in this module.
 */
@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentMapper paymentMapper;

    @Mock
    private PaymentTransactionService paymentTransactionService;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private Payment successPayment;
    private Payment failedPayment;
    private Payment pendingPayment;
    private PaymentResponse successResponse;
    private PaymentResponse failedResponse;

    private static final String TRANSACTION_ID = "TXN-test-uuid-1234";
    private static final Long ORDER_ID = 1001L;
    private static final Long USER_ID = 1L;
    private static final BigDecimal AMOUNT = new BigDecimal("99.99");

    @BeforeEach
    void setUp() {
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

        successResponse = PaymentResponse.builder()
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TRANSACTION_ID)
                .build();

        failedResponse = PaymentResponse.builder()
                .orderId(ORDER_ID)
                .userId(USER_ID)
                .amount(AMOUNT)
                .paymentStatus(PaymentStatus.FAILED)
                .paymentMethod(PaymentMethod.WALLET)
                .transactionId(TRANSACTION_ID)
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

    // ─── processPayment delegates to the transactional step ─────────────────

    @Test
    void processPayment_delegatesToTransactionService() {
        ProcessPaymentRequest request = ProcessPaymentRequest.builder()
                .transactionId(TRANSACTION_ID)
                .build();
        when(paymentTransactionService.processPending(TRANSACTION_ID))
                .thenReturn(successResponse);

        PaymentResponse response = paymentService.processPayment(request);

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(paymentTransactionService, org.mockito.Mockito.times(1))
                .processPending(TRANSACTION_ID);
    }

    // ─── A. duplicate SUCCESS delivery → short-circuit, no processing ───────

    @Test
    void processPaymentIdempotent_existingSuccess_returnsWithoutProcessing() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.of(successPayment));
        when(paymentMapper.toPaymentResponse(successPayment))
                .thenReturn(successResponse);

        PaymentResponse response = paymentService.processPaymentIdempotent(event());

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(paymentTransactionService, never()).createAndProcess(any());
        verify(paymentTransactionService, never()).processPending(anyString());
        verify(paymentTransactionService, never()).resolveExisting(any());
    }

    // ─── B. duplicate FAILED delivery → short-circuit, no reprocessing ──────

    @Test
    void processPaymentIdempotent_existingFailed_returnsWithoutProcessing() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.of(failedPayment));
        when(paymentMapper.toPaymentResponse(failedPayment))
                .thenReturn(failedResponse);

        PaymentResponse response = paymentService.processPaymentIdempotent(event());

        assertEquals(PaymentStatus.FAILED, response.getPaymentStatus());
        verify(paymentTransactionService, never()).createAndProcess(any());
        verify(paymentTransactionService, never()).processPending(anyString());
        verify(paymentTransactionService, never()).resolveExisting(any());
    }

    // ─── C. PENDING record → processed once via the transactional step ──────

    @Test
    void processPaymentIdempotent_existingPending_processedOnce() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.of(pendingPayment));
        when(paymentTransactionService.processPending(TRANSACTION_ID))
                .thenReturn(successResponse);

        PaymentResponse response = paymentService.processPaymentIdempotent(event());

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(paymentTransactionService, org.mockito.Mockito.times(1))
                .processPending(TRANSACTION_ID);
        verify(paymentTransactionService, never()).createAndProcess(any());
        verify(paymentTransactionService, never()).resolveExisting(any());
    }

    // ─── D. no record → claim-and-settle in a new transaction ───────────────

    @Test
    void processPaymentIdempotent_noExisting_createsAndProcesses() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.empty());
        when(paymentTransactionService.createAndProcess(any()))
                .thenReturn(successResponse);

        PaymentResponse response = paymentService.processPaymentIdempotent(event());

        assertNotNull(response);
        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(paymentTransactionService, org.mockito.Mockito.times(1))
                .createAndProcess(event());
        verify(paymentTransactionService, never()).processPending(anyString());
        verify(paymentTransactionService, never()).resolveExisting(any());
    }

    // ─── E. unique-constraint race → re-resolve winner, never re-debit ──────

    @Test
    void processPaymentIdempotent_uniqueConstraintRace_resolvesExisting() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.empty());
        when(paymentTransactionService.createAndProcess(any()))
                .thenThrow(new DataIntegrityViolationException("duplicate order_id"));
        when(paymentTransactionService.resolveExisting(ORDER_ID))
                .thenReturn(successResponse);

        PaymentResponse response = paymentService.processPaymentIdempotent(event());

        // The duplicate must surface the winner's SUCCESS state — not an exception
        // (which would have become a false PaymentFailedEvent in the consumer).
        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(paymentTransactionService, org.mockito.Mockito.times(1))
                .resolveExisting(ORDER_ID);
        verify(paymentTransactionService, never()).processPending(anyString());
    }

    // ─── F. unexpected error propagates (no false SUCCESS) ──────────────────

    @Test
    void processPaymentIdempotent_unexpectedError_propagates() {
        when(paymentRepository.findByOrderId(ORDER_ID))
                .thenReturn(Optional.empty());
        when(paymentTransactionService.createAndProcess(any()))
                .thenThrow(new IllegalStateException("db down"));

        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class,
                () -> paymentService.processPaymentIdempotent(event()));

        verify(paymentTransactionService, never()).resolveExisting(eq(ORDER_ID));
    }
}
