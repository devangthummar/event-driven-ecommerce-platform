package com.ecommerce.inventory.service.impl;

import com.ecommerce.inventory.dto.request.ReserveStockRequest;
import com.ecommerce.inventory.dto.request.StockRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;
import com.ecommerce.inventory.entity.Inventory;
import com.ecommerce.inventory.exception.InventoryNotFoundException;
import com.ecommerce.inventory.mapper.InventoryMapper;
import com.ecommerce.inventory.repository.InventoryRepository;
import com.ecommerce.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;



import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;

    private final InventoryMapper inventoryMapper;

    @Override
    public InventoryResponse createInventory(StockRequest request) {

        if (inventoryRepository.existsByProductId(request.getProductId())) {

            throw new IllegalArgumentException(
                    "Inventory already exists for product."
            );

        }

        Inventory inventory = Inventory.builder()
                .productId(request.getProductId())
                .availableQuantity(request.getQuantity())
                .reservedQuantity(0)
                .totalQuantity(request.getQuantity())
                .lastUpdated(LocalDateTime.now())
                .build();

        Inventory savedInventory = inventoryRepository.save(inventory);

        return inventoryMapper.toInventoryResponse(savedInventory);

    }
    @Override
    public InventoryResponse getInventory(Long productId) {

        Inventory inventory = inventoryRepository
                .findByProductId(productId)
                .orElseThrow(() ->
                        new InventoryNotFoundException(
                                "Inventory not found."
                        ));

        return inventoryMapper.toInventoryResponse(inventory);

    }

    @Override
    public InventoryResponse addStock(StockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductId(request.getProductId())
                .orElseThrow(() ->
                        new InventoryNotFoundException(
                                "Inventory not found."
                        ));

        inventory.setAvailableQuantity(
                inventory.getAvailableQuantity() + request.getQuantity()
        );

        inventory.setTotalQuantity(
                inventory.getTotalQuantity() + request.getQuantity()
        );

        inventory.setLastUpdated(LocalDateTime.now());

        Inventory updatedInventory = inventoryRepository.save(inventory);

        return inventoryMapper.toInventoryResponse(updatedInventory);

    }
    @Override
    public InventoryResponse reserveStock(ReserveStockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductId(request.getProductId())
                .orElseThrow(() ->
                        new InventoryNotFoundException(
                                "Inventory not found."
                        ));

        if (inventory.getAvailableQuantity() < request.getQuantity()) {

            throw new IllegalArgumentException(
                    "Insufficient stock available."
            );

        }

        inventory.setAvailableQuantity(
                inventory.getAvailableQuantity() - request.getQuantity()
        );

        inventory.setReservedQuantity(
                inventory.getReservedQuantity() + request.getQuantity()
        );

        inventory.setLastUpdated(LocalDateTime.now());

        Inventory updatedInventory = inventoryRepository.save(inventory);

        return inventoryMapper.toInventoryResponse(updatedInventory);

    }

    @Override
    public InventoryResponse releaseReservedStock(ReserveStockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductId(request.getProductId())
                .orElseThrow(() ->
                        new InventoryNotFoundException(
                                "Inventory not found."
                        ));

        if (inventory.getReservedQuantity() < request.getQuantity()) {

            throw new IllegalArgumentException(
                    "Reserved quantity is insufficient."
            );

        }

        inventory.setReservedQuantity(
                inventory.getReservedQuantity() - request.getQuantity()
        );

        inventory.setAvailableQuantity(
                inventory.getAvailableQuantity() + request.getQuantity()
        );

        inventory.setLastUpdated(LocalDateTime.now());

        Inventory updatedInventory = inventoryRepository.save(inventory);

        return inventoryMapper.toInventoryResponse(updatedInventory);

    }

    @Override
    public InventoryResponse confirmReservedStock(ReserveStockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductId(request.getProductId())
                .orElseThrow(() ->
                        new InventoryNotFoundException(
                                "Inventory not found."
                        ));

        if (inventory.getReservedQuantity() < request.getQuantity()) {

            throw new IllegalArgumentException(
                    "Reserved quantity is insufficient."
            );

        }

        inventory.setReservedQuantity(
                inventory.getReservedQuantity() - request.getQuantity()
        );

        inventory.setTotalQuantity(
                inventory.getTotalQuantity() - request.getQuantity()
        );

        inventory.setLastUpdated(LocalDateTime.now());

        Inventory updatedInventory = inventoryRepository.save(inventory);

        return inventoryMapper.toInventoryResponse(updatedInventory);

    }

}