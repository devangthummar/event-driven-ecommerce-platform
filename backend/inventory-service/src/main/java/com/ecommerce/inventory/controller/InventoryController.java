package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.ReserveStockRequest;
import com.ecommerce.inventory.dto.request.StockRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;
import com.ecommerce.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    /**
     * Creates inventory for a product. Administrative operation — requires ADMIN role.
     * The Saga flow (Kafka consumers) calls the service layer directly, not this endpoint.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InventoryResponse> createInventory(
            @Valid @RequestBody StockRequest request) {

        InventoryResponse response = inventoryService.createInventory(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    /**
     * Read-only endpoint — any authenticated user may query inventory levels.
     */
    @GetMapping("/{productId}")
    public ResponseEntity<InventoryResponse> getInventory(
            @PathVariable Long productId) {

        return ResponseEntity.ok(inventoryService.getInventory(productId));
    }

    /**
     * Adds stock to an existing product. Administrative operation — requires ADMIN role.
     * The Saga flow calls the service layer directly via Kafka consumers.
     */
    @PutMapping("/add-stock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InventoryResponse> addStock(
            @Valid @RequestBody StockRequest request) {

        return ResponseEntity.ok(inventoryService.addStock(request));
    }

    /**
     * Reserves stock for an order. Administrative/internal operation — requires ADMIN role.
     * The normal Saga flow reserves stock via Kafka consumers calling the service layer.
     */
    @PutMapping("/reserve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InventoryResponse> reserveStock(
            @Valid @RequestBody ReserveStockRequest request) {

        return ResponseEntity.ok(inventoryService.reserveStock(request));
    }

    /**
     * Releases previously reserved stock. Administrative/internal operation — requires ADMIN role.
     * The Saga compensation flow releases stock via Kafka consumers calling the service layer.
     */
    @PutMapping("/release")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InventoryResponse> releaseReservedStock(
            @Valid @RequestBody ReserveStockRequest request) {

        return ResponseEntity.ok(inventoryService.releaseReservedStock(request));
    }

    /**
     * Confirms a reservation (converts reserved to sold). Administrative/internal operation — requires ADMIN role.
     */
    @PutMapping("/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InventoryResponse> confirmReservedStock(
            @Valid @RequestBody ReserveStockRequest request) {

        return ResponseEntity.ok(inventoryService.confirmReservedStock(request));
    }

}
