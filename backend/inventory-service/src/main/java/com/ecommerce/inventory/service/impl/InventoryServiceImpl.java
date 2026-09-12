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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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
    @Transactional
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

    /**
     * Adds stock to an existing inventory. The inventory row is read with a
     * pessimistic (FOR UPDATE) lock so concurrent stock additions for the same product
     * are serialized by the database — preventing lost updates where two additions read
     * the same quantity, both add their amount, and one overwrites the other.
     */
    @Override
    @Transactional
    public InventoryResponse addStock(StockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductIdForUpdate(request.getProductId())
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

    /**
     * Reserves stock for one order/product pair. The inventory row is read with a
     * pessimistic (FOR UPDATE) lock so concurrent reservations of the same product are
     * serialized by the database:
     *
     * <ul>
     *   <li>a racing duplicate OrderCreatedEvent for the same order+product blocks on the
     *       lock, then observes the winner's committed reservation via the idempotency
     *       check below and skips — it can never double-decrement or fail the order;</li>
     *   <li>two different orders reserving the same product concurrently both re-read the
     *       fresh stock after the lock wait, so an order is only rejected when the stock
     *       is genuinely insufficient (no optimistic-lock false failures).</li>
     * </ul>
     */
    @Override
    @Transactional
    public InventoryResponse reserveStock(ReserveStockRequest request) {

        // Lock the inventory row FIRST so the duplicate check and the stock check below
        // run against the latest committed state (serialized with other reservations).
        Inventory inventory = inventoryRepository
                .findByProductIdForUpdate(request.getProductId())
                .orElseThrow(() ->
                        new InventoryNotFoundException(
                                "Inventory not found."
                        ));

        // Idempotency guard for Kafka at-least-once delivery: an order/product pair
        // is reserved exactly once. If OrderCreatedEvent is redelivered (producer
        // retry, consumer rebalance after partial failure), do NOT reserve again.
        if (reservationRepository.existsByOrderIdAndProductId(
                request.getOrderId(), request.getProductId())) {
            log.info("Reservation already exists for orderId={}, productId={}. Skipping duplicate reservation (idempotent).",
                    request.getOrderId(), request.getProductId());
            return inventoryMapper.toInventoryResponse(inventory);
        }

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
    }

    /**
     * Releases previously reserved stock back to available. The inventory row is read
     * with a pessimistic (FOR UPDATE) lock so concurrent releases for the same product
     * are serialized by the database — the second concurrent caller blocks on the lock,
     * re-reads the fresh committed state, and either succeeds or fails on the updated
     * reserved quantity.
     */
    @Override
    @Transactional
    public InventoryResponse releaseReservedStock(ReserveStockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductIdForUpdate(request.getProductId())
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

    }    /**
     * Confirms a reservation by converting reserved stock into total (sold) stock. The
     * inventory row is read with a pessimistic (FOR UPDATE) lock so concurrent
     * confirmations for the same product are serialized by the database.
     */
    @Override
    @Transactional
    public InventoryResponse confirmReservedStock(ReserveStockRequest request) {

        Inventory inventory = inventoryRepository
                .findByProductIdForUpdate(request.getProductId())
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

    /**
     * Saga compensation: releases every still-RESERVED reservation of the order inside a
     * single transaction. Each inventory row is locked FOR UPDATE so a concurrent
     * reservation of the same product (a different order) cannot interleave a stale
     * read between the compensation's check and its update.
     *
     * <p>Idempotent: a duplicate OrderCancelledEvent finds no RESERVED rows and is a
     * no-op; CONFIRMED rows are never released by compensation.
     */
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
                    .findByProductIdForUpdate(reservation.getProductId())
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
