package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.entity.Wallet;
import com.ecommerce.payment.exception.InsufficientWalletBalanceException;
import com.ecommerce.payment.exception.WalletAlreadyExistsException;
import com.ecommerce.payment.exception.WalletNotFoundException;
import com.ecommerce.payment.repository.WalletRepository;
import com.ecommerce.payment.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class WalletServiceImpl implements WalletService {

    private final WalletRepository walletRepository;

    /**
     * The {@code user_id} UNIQUE constraint is the real guard against duplicate
     * wallets. The {@code existsByUserId} pre-check only avoids paying the cost of a
     * doomed insert; if two concurrent requests race past it, the loser's insert fails
     * the constraint and is translated into the same domain exception as the pre-check.
     */
    @Override
    public Wallet createWallet(Long userId) {

        if (walletRepository.existsByUserId(userId)) {
            throw new WalletAlreadyExistsException(
                    "Wallet already exists for this user."
            );
        }

        Wallet wallet = Wallet.builder()
                .userId(userId)
                .balance(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        try {
            return walletRepository.save(wallet);
        } catch (DataIntegrityViolationException e) {
            // Concurrent createWallet for the same user: the other request won the
            // insert. Surface the same conflict the pre-check would have produced.
            throw new WalletAlreadyExistsException(
                    "Wallet already exists for this user."
            );
        }
    }

    @Override
    public Wallet getWalletByUserId(Long userId) {

        return walletRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new WalletNotFoundException(
                                "Wallet not found for user."
                        ));
    }

    /**
     * Atomic, guarded credit. The increment is a single
     * {@code UPDATE wallets SET balance = balance + :amount WHERE user_id = :userId}
     * statement, so concurrent top-ups of the same wallet are serialized by the
     * database row lock and both additions are retained — a read-modify-write
     * implementation would silently lose the last writer's update.
     *
     * <p>Annotated {@code @Transactional} so the read-back of the fresh balance happens
     * in the same transaction as the UPDATE (this method is only ever invoked from the
     * REST layer, where no surrounding transaction exists, so the annotation simply
     * opens one — it can never poison a caller's transaction the way it would for
     * {@link #deductBalance}).
     */
    @Override
    @Transactional
    public Wallet addBalance(Long userId, BigDecimal amount) {

        // A top-up must be positive: the atomic UPDATE is intentionally unguarded (no
        // minimum-balance clause), so a zero/negative "top-up" would otherwise be a
        // silent withdrawal that could drive the wallet below zero.
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Top-up amount must be greater than zero."
            );
        }

        int credited = walletRepository.addBalanceAtomically(
                userId, amount, LocalDateTime.now());

        if (credited == 1) {
            // Re-read inside the same transaction to return the fresh balance.
            return walletRepository.findByUserId(userId)
                    .orElseThrow(() ->
                            new WalletNotFoundException(
                                    "Wallet not found for user."
                            ));
        }

        // 0 rows affected: no wallet row exists for this user.
        throw new WalletNotFoundException(
                "Wallet not found for user."
        );
    }

    /**
     * Atomic guarded debit. The balance check and the subtraction are executed as a
     * single {@code UPDATE wallets SET balance = balance - :amount WHERE user_id = :userId
     * AND balance >= :amount} so concurrent debits of the same wallet are serialized by
     * the database row lock.
     *
     * <p>Deliberately NOT {@code @Transactional}: payment processing invokes this inside
     * its own REQUIRES_NEW transaction (see {@link PaymentTransactionService#settle}), so
     * the atomic UPDATE participates in that transaction and rolls back with it. Making
     * this method transactional itself would mark the joined payment transaction
     * rollback-only when the insufficient-balance exception is caught upstream. Callers
     * that are not already inside a transaction must provide one.
     */
    @Override
    public Wallet deductBalance(Long userId, BigDecimal amount) {

        int debited = walletRepository.deductBalanceIfSufficient(
                userId, amount, LocalDateTime.now());

        if (debited == 1) {
            // Re-read inside the same transaction to return the fresh balance.
            return walletRepository.findByUserId(userId)
                    .orElseThrow(() ->
                            new WalletNotFoundException("Wallet not found for user."));
        }

        // 0 rows affected: either the wallet does not exist or the balance is insufficient.
        if (!walletRepository.existsByUserId(userId)) {
            throw new WalletNotFoundException("Wallet not found for user.");
        }

        throw new InsufficientWalletBalanceException(
                "Insufficient wallet balance."
        );
    }
}
