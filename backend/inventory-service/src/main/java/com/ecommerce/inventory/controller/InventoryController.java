package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.ReserveStockRequest;
import com.ecommerce.inventory.dto.request.StockRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;
import com.ecommerce.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping
    public ResponseEntity<InventoryResponse> createInventory(
            @Valid @RequestBody StockRequest request) {

        InventoryResponse response = inventoryService.createInventory(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/{productId}")
    public ResponseEntity<InventoryResponse> getInventory(
            @PathVariable Long productId) {

        return ResponseEntity.ok(
                inventoryService.getInventory(productId));
    }

    @PutMapping("/add-stock")
    public ResponseEntity<InventoryResponse> addStock(
            @Valid @RequestBody StockRequest request) {

        return ResponseEntity.ok(
                inventoryService.addStock(request));
    }

    @PutMapping("/reserve")
    public ResponseEntity<InventoryResponse> reserveStock(
            @Valid @RequestBody ReserveStockRequest request) {

        return ResponseEntity.ok(
                inventoryService.reserveStock(request));
    }

    @PutMapping("/release")
    public ResponseEntity<InventoryResponse> releaseReservedStock(
            @Valid @RequestBody ReserveStockRequest request) {

        return ResponseEntity.ok(
                inventoryService.releaseReservedStock(request));
    }

    @PutMapping("/confirm")
    public ResponseEntity<InventoryResponse> confirmReservedStock(
            @Valid @RequestBody ReserveStockRequest request) {

        return ResponseEntity.ok(
                inventoryService.confirmReservedStock(request));
    }

}
