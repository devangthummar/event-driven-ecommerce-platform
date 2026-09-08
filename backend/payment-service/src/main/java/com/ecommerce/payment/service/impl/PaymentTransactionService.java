package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentMethod;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.event.PaymentRequestEvent;
import com.ecommerce.payment.exception.PaymentNotFoundException;
import com.ecommerce.payment.mapper.PaymentMapper;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Executes every payment state change in its own {@code REQUIRES_NEW} transaction.
 *
 * <p>Why: when two identical PaymentRequestEvents arrive concurrently, exactly one
 * insert of the {@code payments.order_id} UNIQUE row can win. The loser receives a
 * {@code DataIntegrityViolationException} whose transaction MUST be fully rolled back
 * before the duplicate is re-resolved — continuing to use a transaction after a
 * constraint violation is unsafe. Keeping every mutation in its own short transaction
 * means the loser's failed insert can never contaminate the winner's state and can
 * never produce a false PaymentFailedEvent.
 *
 * <p>Because these methods are called through the Spring proxy (from
 * {@link PaymentServiceImpl}), {@code REQUIRES_NEW} creates a real new transaction per
 * invocation; the wallet debit, status transition and insert all commit or roll back
 * together.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentTransactionService {

    private final PaymentRepository paymentRepository;
    private final WalletService walletService;
    private final PaymentMapper paymentMapper;

    /**
     * Claim-and-settle: inserts a PENDING payment for the order and immediately debits
     * the wallet and settles the payment, all atomically in ONE new transaction.
     *
     * <p>If another concurrent event already inserted the same orderId, the UNIQUE
     * constraint fires during the insert and this transaction is rolled back — no
     * payment row and no wallet debit are persisted — and the exception propagates to
     * the caller (which then re-resolves the winner's committed state).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentResponse createAndProcess(PaymentRequestEvent event) {

        Payment payment = Payment.builder()
                .orderId(event.getOrderId())
                .userId(event.getUserId())
                .amount(event.getAmount())
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMethod(PaymentMethod.valueOf(event.getPaymentMethod()))
                .transactionId("TXN-" + UUID.randomUUID())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        paymentRepository.save(payment);

        settle(payment);

        return paymentMapper.toPaymentResponse(payment);
    }

    /**
     * Processes an already-created payment inside a NEW transaction. The PESSIMISTIC
     * lock serializes concurrent processing of the same payment: the loser blocks until
     * the winner commits, then re-reads the committed SUCCESS/FAILED row and returns
     * early without touching the wallet again.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentResponse processPending(String transactionId) {

        Payment payment = paymentRepository
                .findByTransactionIdForUpdate(transactionId)
                .orElseThrow(() ->
                        new PaymentNotFoundException(
                                "Payment not found for transaction ID: "
                                        + transactionId));

        if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return paymentMapper.toPaymentResponse(payment);
        }

        // A FAILED payment must not be debited again (the original debit already
        // failed and left the wallet untouched). This short-circuit is essential for
        // the REST path where a client may retry processPayment with a transactionId
        // whose payment is already FAILED; the Kafka path is similarly protected because
        // PaymentServiceImpl.processPaymentIdempotent returns an existing FAILED payment
        // without ever calling processPending.
        if (payment.getPaymentStatus() == PaymentStatus.FAILED) {
            return paymentMapper.toPaymentResponse(payment);
        }

        settle(payment);

        return paymentMapper.toPaymentResponse(payment);
    }

    /**
     * Re-resolves an order after this instance lost the insert race (unique constraint).
     * Runs in a NEW transaction so the read sees the winner's committed state.
     * SUCCESS/FAILED rows are returned as-is; a PENDING row (only possible from an older
     * flow that committed a PENDING row) is locked and settled defensively.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentResponse resolveExisting(Long orderId) {

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalStateException(
                        "Payment disappeared after constraint violation for orderId=" + orderId));

        if (payment.getPaymentStatus() == PaymentStatus.PENDING) {
            Payment locked = paymentRepository
                    .findByTransactionIdForUpdate(payment.getTransactionId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Payment disappeared after constraint violation for orderId=" + orderId));
            if (locked.getPaymentStatus() == PaymentStatus.PENDING) {
                settle(locked);
            }
            return paymentMapper.toPaymentResponse(locked);
        }

        return paymentMapper.toPaymentResponse(payment);
    }

    /**
     * Attempts the wallet debit and settles the payment to SUCCESS or FAILED. A failed
     * debit (insufficient balance, missing wallet, or any runtime failure) marks the
     * payment FAILED — matching the pre-existing processPayment contract — and is
     * committed so the failure is durable and idempotent.
     */
    private void settle(Payment payment) {

        try {
            walletService.deductBalance(payment.getUserId(), payment.getAmount());
            payment.setPaymentStatus(PaymentStatus.SUCCESS);
        } catch (RuntimeException exception) {
            log.warn("Wallet debit failed for orderId={}, transactionId={}: {}",
                    payment.getOrderId(), payment.getTransactionId(), exception.getMessage());
            payment.setPaymentStatus(PaymentStatus.FAILED);
        }

        payment.setUpdatedAt(LocalDateTime.now());

        paymentRepository.save(payment);
    }
}
