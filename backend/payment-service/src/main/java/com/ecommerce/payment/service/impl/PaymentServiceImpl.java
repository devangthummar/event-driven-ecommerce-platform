package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.dto.request.CreatePaymentRequest;
import com.ecommerce.payment.dto.request.ProcessPaymentRequest;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.exception.PaymentNotFoundException;
import com.ecommerce.payment.mapper.PaymentMapper;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final PaymentTransactionService paymentTransactionService;

    @Override
    public PaymentResponse createPayment(CreatePaymentRequest request) {

        String transactionId = "TXN-" + UUID.randomUUID();

        Payment payment = Payment.builder()
                .orderId(request.getOrderId())
                .userId(request.getUserId())
                .amount(request.getAmount())
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .transactionId(transactionId)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        return paymentMapper.toPaymentResponse(savedPayment);
    }

    @Override
    public PaymentResponse getPaymentByTransactionId(String transactionId) {

        Payment payment = paymentRepository
                .findByTransactionId(transactionId)
                .orElseThrow(() ->
                        new PaymentNotFoundException(
                                "Payment not found for transaction ID: "
                                        + transactionId));

        return paymentMapper.toPaymentResponse(payment);
    }

    /**
     * Processes an existing payment (REST path). Delegates to a dedicated
     * REQUIRES_NEW transaction so the pessimistic lock is held for the whole
     * debit-and-settle unit of work.
     */
    @Override
    public PaymentResponse processPayment(ProcessPaymentRequest request) {
        return paymentTransactionService.processPending(request.getTransactionId());
    }

    /**
     * Idempotent payment processing for Kafka at-least-once delivery.
     *
     * <p>No transaction is held on this orchestrator. Every state mutation runs in its
     * own {@code REQUIRES_NEW} transaction inside {@link PaymentTransactionService}, so
     * a duplicate that loses the UNIQUE(orderId) insert race fails and rolls back in
     * isolation and is then re-resolved against the winner's committed row. A duplicate
     * therefore never re-debits the wallet and never surfaces as a false failure.
     *
     * Flow:
     *   1. Existing SUCCESS/FAILED payment  -> return it (idempotent)
     *   2. Existing PENDING payment          -> process it in a new transaction
     *   3. No payment                        -> create + process in one new transaction;
     *      on unique-constraint race, re-resolve the winner's committed state.
     */
    @Override
    public PaymentResponse processPaymentIdempotent(PaymentRequestEvent event) {

        log.info("Idempotent payment processing for orderId={}", event.getOrderId());

        var existingPayment = paymentRepository.findByOrderId(event.getOrderId());

        if (existingPayment.isPresent()) {
            Payment payment = existingPayment.get();
            log.info("Payment already exists for orderId={}, status={}",
                    event.getOrderId(), payment.getPaymentStatus());

            // Step 2a: SUCCESS -> return existing result (idempotent)
            if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
                log.info("Returning existing SUCCESS payment for orderId={}", event.getOrderId());
                return paymentMapper.toPaymentResponse(payment);
            }

            // Step 2b: FAILED -> return existing result (idempotent)
            if (payment.getPaymentStatus() == PaymentStatus.FAILED) {
                log.info("Returning existing FAILED payment for orderId={}", event.getOrderId());
                return paymentMapper.toPaymentResponse(payment);
            }

            // Step 2c: PENDING -> process it (was created but not yet processed)
            if (payment.getPaymentStatus() == PaymentStatus.PENDING) {
                log.info("Processing existing PENDING payment for orderId={}, transactionId={}",
                        event.getOrderId(), payment.getTransactionId());
                return paymentTransactionService.processPending(payment.getTransactionId());
            }
        }

        // Step 3: No existing payment -> claim-and-settle in ONE new transaction. If a
        // concurrent event raced ahead and inserted the same orderId, the insert fails
        // the unique constraint and rolls back cleanly; resolve the winner's committed
        // state instead of trying to continue inside the failed transaction.
        log.info("No existing payment for orderId={}. Creating new payment...", event.getOrderId());

        try {
            return paymentTransactionService.createAndProcess(event);
        } catch (DataIntegrityViolationException ex) {
            log.warn("Race condition detected for orderId={} (unique constraint). "
                    + "Re-resolving the committed payment.", event.getOrderId());
            return paymentTransactionService.resolveExisting(event.getOrderId());
        }
    }
}
