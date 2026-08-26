package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.dto.request.CreatePaymentRequest;
import com.ecommerce.payment.dto.request.ProcessPaymentRequest;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.exception.PaymentNotFoundException;
import com.ecommerce.payment.mapper.PaymentMapper;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.PaymentService;
import com.ecommerce.payment.service.WalletService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final WalletService walletService;

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
                                        + transactionId
                        ));

        return paymentMapper.toPaymentResponse(payment);
    }


    @Transactional
    @Override
    public PaymentResponse processPayment(ProcessPaymentRequest request) {

        Payment payment = paymentRepository
                .findByTransactionId(request.getTransactionId())
                .orElseThrow(() ->
                        new PaymentNotFoundException(
                                "Payment not found for transaction ID: "
                                        + request.getTransactionId()
                        ));

        if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return paymentMapper.toPaymentResponse(payment);
        }

        try {

            walletService.deductBalance(
                    payment.getUserId(),
                    payment.getAmount()
            );

            payment.setPaymentStatus(PaymentStatus.SUCCESS);

        } catch (RuntimeException exception) {


            payment.setPaymentStatus(PaymentStatus.FAILED);
        }

        payment.setUpdatedAt(LocalDateTime.now());

        Payment savedPayment = paymentRepository.save(payment);

        return paymentMapper.toPaymentResponse(savedPayment);
    }

    /**
     * Idempotent payment processing for Kafka at-least-once delivery.
     *
     * ASSUMPTION: No duplicate orderId records exist in the database before this
     * migration is applied. The UNIQUE constraint on orderId in the payments table
     * enforces this going forward.
     *
     * Flow:
     *   1. Check if payment exists by orderId
     *   2. If exists with SUCCESS/FAILED status -> return existing result (idempotent)
     *   3. If exists with PENDING status -> proceed to processPayment()
     *   4. If NOT exists -> create payment, then processPayment()
     */
    @Transactional
    public PaymentResponse processPaymentIdempotent(PaymentRequestEvent event) {

        log.info("Idempotent payment processing for orderId={}", event.getOrderId());

        // Step 1: Check if payment already exists for this orderId
        var existingPayment = paymentRepository.findByOrderId(event.getOrderId());

        if (existingPayment.isPresent()) {
            Payment payment = existingPayment.get();
            log.info("Payment already exists for orderId={}, status={}",
                    event.getOrderId(), payment.getPaymentStatus());

            // Step 2a: If SUCCESS -> return existing result (idempotent)
            if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
                log.info("Returning existing SUCCESS payment for orderId={}", event.getOrderId());
                return paymentMapper.toPaymentResponse(payment);
            }

            // Step 2b: If FAILED -> return existing result (idempotent)
            if (payment.getPaymentStatus() == PaymentStatus.FAILED) {
                log.info("Returning existing FAILED payment for orderId={}", event.getOrderId());
                return paymentMapper.toPaymentResponse(payment);
            }

            // Step 2c: If PENDING -> process it (was created but not yet processed)
            if (payment.getPaymentStatus() == PaymentStatus.PENDING) {
                log.info("Processing existing PENDING payment for orderId={}, transactionId={}",
                        event.getOrderId(), payment.getTransactionId());
                ProcessPaymentRequest processRequest = ProcessPaymentRequest.builder()
                        .transactionId(payment.getTransactionId())
                        .build();
                return processPayment(processRequest);
            }
        }

        // Step 3: No existing payment -> create and process
        // Try-Catch-Retry: if another thread raced ahead and inserted the same orderId,
        // createPayment() will throw DataIntegrityViolationException due to the UNIQUE
        // constraint on orderId. We catch that, re-fetch the existing record, and act on it.
        log.info("No existing payment for orderId={}. Creating new payment...", event.getOrderId());
        CreatePaymentRequest createRequest = CreatePaymentRequest.builder()
                .orderId(event.getOrderId())
                .userId(event.getUserId())
                .amount(event.getAmount())
                .paymentMethod(PaymentMethod.valueOf(event.getPaymentMethod()))
                .build();

        try {

            PaymentResponse createdPayment = createPayment(createRequest);

            ProcessPaymentRequest processRequest = ProcessPaymentRequest.builder()
                    .transactionId(createdPayment.getTransactionId())
                    .build();

            return processPayment(processRequest);

        } catch (DataIntegrityViolationException ex) {
            // Race condition: another thread/process already created the payment record
            // for this orderId. Re-fetch it and act on its current state.
            log.warn("Race condition detected for orderId={}. Re-fetching existing payment.",
                    event.getOrderId());

            Payment racePayment = paymentRepository.findByOrderId(event.getOrderId())
                    .orElseThrow(() -> new RuntimeException(
                            "Payment disappeared after constraint violation for orderId="
                                    + event.getOrderId()));

            if (racePayment.getPaymentStatus() == PaymentStatus.PENDING) {
                log.info("Re-fetched PENDING payment for orderId={}, processing...",
                        event.getOrderId());
                ProcessPaymentRequest retryRequest = ProcessPaymentRequest.builder()
                        .transactionId(racePayment.getTransactionId())
                        .build();
                return processPayment(retryRequest);
            }

            // Already SUCCESS or FAILED — return as-is (idempotent)
            log.info("Re-fetched {} payment for orderId={}, returning existing result.",
                    racePayment.getPaymentStatus(), event.getOrderId());
            return paymentMapper.toPaymentResponse(racePayment);
        }
    }
}