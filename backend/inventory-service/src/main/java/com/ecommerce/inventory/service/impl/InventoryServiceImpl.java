package com.ecommerce.inventory.service.impl;

import com.ecommerce.inventory.dto.request.ReserveStockRequest;
import com.ecommerce.inventory.dto.request.StockRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;
import com.ecommerce.inventory.entity.Inventory;
import com.ecommerce.inventory.entity.Reservation;
import com.ecommerce.inventory.entity.enums.ReservationStatus;
import com.ecommerce.inventory.exception.InsufficientStockException;
import com.ecommerce.inventory.exception.InventoryAlreadyExistsException;
import com.ecommerce.inventory.exception.InventoryNotFoundException;
import com.ecommerce.inventory.mapper.InventoryMapper;
import com.ecommerce.inventory.repository.InventoryRepository;
import com.ecommerce.inventory.repository.ReservationRepository;
import com.ecommerce.inventory.service.InventoryService;
import jakarta.persistence.OptimisticLockException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ReservationRepository reservationRepository;
    private final InventoryMapper inventoryMapper;

    @Override
    public InventoryResponse createInventory(StockRequest request) {

        if (inventoryRepository.existsByProductId(request.getProductId())) {

            throw new InventoryAlreadyExistsException(
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

    }    @Override
    @Transactional
    public InventoryResponse reserveStock(ReserveStockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductId(request.getProductId())
                .orElseThrow(() ->
                        new InventoryNotFoundException(
                                "Inventory not found."
                        ));

        if (inventory.getAvailableQuantity() < request.getQuantity()) {

            throw new InsufficientStockException(
                    "Reserved quantity is insufficient."
            );

        }

        inventory.setAvailableQuantity(
                inventory.getAvailableQuantity() - request.getQuantity()
        );

        inventory.setReservedQuantity(
                inventory.getReservedQuantity() + request.getQuantity()
        );

        inventory.setLastUpdated(LocalDateTime.now());

        try {
            Inventory updatedInventory = inventoryRepository.save(inventory);

            Reservation reservation = Reservation.builder()
                    .orderId(request.getOrderId())
                    .productId(request.getProductId())
                    .quantity(request.getQuantity())
                    .status(ReservationStatus.RESERVED)
                    .createdAt(LocalDateTime.now())
                    .build();

            reservationRepository.save(reservation);

            return inventoryMapper.toInventoryResponse(updatedInventory);

        } catch (ObjectOptimisticLockingFailureException | OptimisticLockException e) {
            log.warn("Optimistic locking failure during stock reservation for productId={}. Concurrent modification detected.",
                    request.getProductId());
            throw new InsufficientStockException(
                    "Stock reservation failed due to concurrent modification. Please retry."
            );
        }
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

    }    @Override
    public InventoryResponse confirmReservedStock(ReserveStockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductId(request.getProductId())
                .orElseThrow(() ->
                        new InventoryNotFoundException(
                                "Inventory not found."
                        ));

        if (inventory.getReservedQuantity() < request.getQuantity()) {

            throw new InsufficientStockException(
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

    @Override
    @Transactional
    public void releaseStockForOrder(Long orderId) {

        List<Reservation> reservations = reservationRepository
                .findByOrderIdAndStatus(orderId, ReservationStatus.RESERVED);

        if (reservations.isEmpty()) {
            log.warn("No active reservation found for orderId={}. Skipping stock release (idempotent).", orderId);
            return;
        }

        for (Reservation reservation : reservations) {

            Inventory inventory = inventoryRepository
                    .findByProductId(reservation.getProductId())
                    .orElseThrow(() ->
                            new InventoryNotFoundException(
                                    "Inventory not found for productId=" + reservation.getProductId()
                            ));

            inventory.setReservedQuantity(
                    inventory.getReservedQuantity() - reservation.getQuantity()
            );

            inventory.setAvailableQuantity(
                    inventory.getAvailableQuantity() + reservation.getQuantity()
            );

            inventory.setLastUpdated(LocalDateTime.now());

            inventoryRepository.save(inventory);

            reservation.setStatus(ReservationStatus.RELEASED);
            reservation.setUpdatedAt(LocalDateTime.now());

            reservationRepository.save(reservation);

            log.info("Released stock for orderId={}, productId={}, quantity={}",
                    orderId, reservation.getProductId(), reservation.getQuantity());
        }

        log.info("Stock release completed for orderId={}. Total reservations released: {}",
                orderId, reservations.size());
    }

}
