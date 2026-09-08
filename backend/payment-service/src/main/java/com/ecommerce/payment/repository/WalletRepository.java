package com.ecommerce.payment.repository;

import com.ecommerce.payment.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

public interface WalletRepository extends JpaRepository<Wallet, Long> {

    Optional<Wallet> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    /**
     * Atomic guarded debit: the balance check and the subtraction happen in a single
     * UPDATE ... WHERE balance &gt;= :amount statement, so concurrent debits against the
     * same wallet are serialized by the database row lock and can never overspend.
     *
     * <p>Returns 1 when the debit was applied, 0 when the wallet is missing or the
     * balance is insufficient (PostgreSQL re-evaluates the WHERE clause against the
     * freshly committed row after the lock wait).
     */
    @Modifying
    @Query("UPDATE Wallet w SET w.balance = w.balance - :amount, "
            + "w.updatedAt = :updatedAt "
            + "WHERE w.userId = :userId AND w.balance >= :amount")
    int deductBalanceIfSufficient(@Param("userId") Long userId,
                                  @Param("amount") BigDecimal amount,
                                  @Param("updatedAt") LocalDateTime updatedAt);

    /**
     * Atomic, unguarded credit: the increment happens in a single
     * {@code UPDATE wallets SET balance = balance + :amount ...} statement, so two
     * concurrent {@code addBalance} calls against the same wallet can never lose an
     * update through a read-modify-write race — the database row lock serializes them
     * and each addition is applied to the freshly committed balance.
     *
     * <p>Returns 1 when the credit was applied, 0 when no wallet exists for the user.
     */
    @Modifying
    @Query("UPDATE Wallet w SET w.balance = w.balance + :amount, "
            + "w.updatedAt = :updatedAt "
            + "WHERE w.userId = :userId")
    int addBalanceAtomically(@Param("userId") Long userId,
                             @Param("amount") BigDecimal amount,
                             @Param("updatedAt") LocalDateTime updatedAt);

}

