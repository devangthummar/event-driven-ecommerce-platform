package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.ReserveStockRequest;
import com.ecommerce.inventory.dto.request.StockRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;

public interface InventoryService {


    InventoryResponse createInventory(StockRequest request);

    InventoryResponse getInventory(Long productId);

    InventoryResponse addStock(StockRequest request);

    InventoryResponse reserveStock(ReserveStockRequest request);

    InventoryResponse releaseReservedStock(ReserveStockRequest request);

    InventoryResponse confirmReservedStock(ReserveStockRequest request);

}