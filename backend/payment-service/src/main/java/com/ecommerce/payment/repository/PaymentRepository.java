package com.ecommerce.payment.repository;

import com.ecommerce.payment.entity.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTransactionId(String transactionId);

    Optional<Payment> findByOrderId(Long orderId);

    boolean existsByTransactionId(String transactionId);

    /**
     * SELECT ... FOR UPDATE on the payment row.
     *
     * <p>Serializes concurrent processing of the SAME payment (e.g. duplicate
     * PaymentRequestEvent deliveries processed by two threads/instances). The second
     * transaction blocks until the first commits, then re-reads the committed row
     * (SUCCESS/FAILED) and skips the wallet debit instead of double-deducting.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.transactionId = :transactionId")
    Optional<Payment> findByTransactionIdForUpdate(@Param("transactionId") String transactionId);

}
