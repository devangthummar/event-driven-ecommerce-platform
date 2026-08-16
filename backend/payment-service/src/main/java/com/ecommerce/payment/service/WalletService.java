package com.ecommerce.payment.service;

import com.ecommerce.payment.entity.Wallet;

import java.math.BigDecimal;

public interface WalletService {

    Wallet createWallet(Long userId);

    Wallet getWalletByUserId(Long userId);

    Wallet addBalance(Long userId, BigDecimal amount);

    Wallet deductBalance(Long userId, BigDecimal amount);
}