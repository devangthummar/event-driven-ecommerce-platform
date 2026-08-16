package com.ecommerce.payment.controller;

import com.ecommerce.payment.entity.Wallet;
import com.ecommerce.payment.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @PostMapping("/{userId}")
    public ResponseEntity<Wallet> createWallet(
            @PathVariable Long userId) {

        Wallet wallet = walletService.createWallet(userId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(wallet);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Wallet> getWallet(
            @PathVariable Long userId) {

        return ResponseEntity.ok(
                walletService.getWalletByUserId(userId)
        );
    }

    @PatchMapping("/{userId}/balance")
    public ResponseEntity<Wallet> addBalance(
            @PathVariable Long userId,
            @RequestParam BigDecimal amount) {

        return ResponseEntity.ok(
                walletService.addBalance(userId, amount)
        );
    }
}