package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.outbox.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/outbox")
@RequiredArgsConstructor
@Slf4j
public class AdminOutboxController {

    private final OutboxService outboxService;

    @PostMapping("/retry-failed")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> retryFailedOutboxMessages() {
        log.info("Admin request received to retry FAILED outbox messages in Inventory Service");
        int retriedCount = outboxService.retryFailedOutboxMessages();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Reset failed outbox messages to PENDING");
        response.put("retriedCount", retriedCount);
        response.put("status", 200);
        return ResponseEntity.ok(response);
    }
}
