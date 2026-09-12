package com.ecommerce.payment.controller;

import com.ecommerce.payment.entity.Wallet;
import com.ecommerce.payment.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getDetails() == null) return null;
        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) auth.getDetails();
        return (Long) details.get("userId");
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    /**
     * Enforces that the authenticated user owns this wallet, or is an ADMIN.
     * Service-to-service calls (Kafka → PaymentTransactionService → WalletService)
     * bypass HTTP controllers entirely, so this check only applies to REST callers.
     */
    private void enforceOwnership(Long resourceUserId) {
        if (isAdmin()) return;
        Long uid = currentUserId();
        if (uid == null || !uid.equals(resourceUserId)) {
            throw new AccessDeniedException(
                    "You do not have permission to access this wallet.");
        }
    }

    @PostMapping("/{userId}")
    public ResponseEntity<Wallet> createWallet(
            @PathVariable Long userId) {

        enforceOwnership(userId);

        Wallet wallet = walletService.createWallet(userId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(wallet);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Wallet> getWallet(
            @PathVariable Long userId) {

        enforceOwnership(userId);

        return ResponseEntity.ok(
                walletService.getWalletByUserId(userId)
        );
    }

    @PatchMapping("/{userId}/balance")
    public ResponseEntity<Wallet> addBalance(
            @PathVariable Long userId,
            @RequestParam BigDecimal amount) {

        enforceOwnership(userId);

        return ResponseEntity.ok(
                walletService.addBalance(userId, amount)
        );
    }
}