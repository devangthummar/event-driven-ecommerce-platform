package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.entity.Wallet;
import com.ecommerce.payment.exception.InsufficientWalletBalanceException;
import com.ecommerce.payment.exception.WalletAlreadyExistsException;
import com.ecommerce.payment.exception.WalletNotFoundException;
import com.ecommerce.payment.repository.WalletRepository;
import com.ecommerce.payment.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class WalletServiceImpl implements WalletService {

    private final WalletRepository walletRepository;

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

        return walletRepository.save(wallet);
    }

    @Override
    public Wallet getWalletByUserId(Long userId) {

        return walletRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new WalletNotFoundException(
                                "Wallet not found for user."
                        ));
    }

    @Override
    public Wallet deductBalance(Long userId, BigDecimal amount) {

        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new RuntimeException("Wallet not found for user."));

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientWalletBalanceException(
                    "Insufficient wallet balance."
            );
        }

        wallet.setBalance(
                wallet.getBalance().subtract(amount)
        );

        wallet.setUpdatedAt(LocalDateTime.now());

        return walletRepository.save(wallet);
    }
    @Override
    public Wallet addBalance(Long userId, BigDecimal amount) {

        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new RuntimeException("Wallet not found for user."));

        wallet.setBalance(
                wallet.getBalance().add(amount)
        );

        wallet.setUpdatedAt(LocalDateTime.now());

        return walletRepository.save(wallet);
    }
}