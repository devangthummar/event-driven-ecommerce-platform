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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceImplTest {

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private InventoryMapper inventoryMapper;

    @InjectMocks
    private InventoryServiceImpl inventoryService;

    private Inventory inventory;
    private ReserveStockRequest reserveRequest;
    private InventoryResponse inventoryResponse;

    private static final Long ORDER_ID = 500L;
    private static final Long PRODUCT_ID = 100L;

    @BeforeEach
    void setUp() {
        inventory = Inventory.builder()
                .id(1L)
                .productId(PRODUCT_ID)
                .availableQuantity(10)
                .reservedQuantity(0)
                .totalQuantity(10)
                .lastUpdated(LocalDateTime.now())
                .build();

        reserveRequest = ReserveStockRequest.builder()
                .orderId(ORDER_ID)
                .productId(PRODUCT_ID)
                .quantity(5)
                .build();

        inventoryResponse = InventoryResponse.builder()
                .productId(PRODUCT_ID)
                .availableQuantity(10)
                .reservedQuantity(0)
                .build();
    }

    @Test
    void reserveStock_withoutExistingReservation_reservesStock() {
        // reserveStock reads the row with a pessimistic (FOR UPDATE) lock.
        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));
        when(reservationRepository.existsByOrderIdAndProductId(ORDER_ID, PRODUCT_ID))
                .thenReturn(false);
        when(inventoryRepository.save(any(Inventory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(reservationRepository.save(any(Reservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryMapper.toInventoryResponse(any(Inventory.class)))
                .thenReturn(inventoryResponse);

        inventoryService.reserveStock(reserveRequest);

        assertEquals(5, inventory.getAvailableQuantity());
        assertEquals(5, inventory.getReservedQuantity());
        verify(reservationRepository, times(1)).save(any(Reservation.class));
    }

    @Test
    void reserveStock_duplicateReservation_isIdempotentAndSkipsDoubleReserve() {
        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));
        // Reservation already recorded for this order+product (e.g. OrderCreatedEvent redelivery)
        when(reservationRepository.existsByOrderIdAndProductId(ORDER_ID, PRODUCT_ID))
                .thenReturn(true);
        when(inventoryMapper.toInventoryResponse(any(Inventory.class)))
                .thenReturn(inventoryResponse);

        InventoryResponse response = inventoryService.reserveStock(reserveRequest);

        assertNotNull(response);
        // Stock must NOT be reserved a second time
        assertEquals(10, inventory.getAvailableQuantity());
        assertEquals(0, inventory.getReservedQuantity());
        verify(inventoryRepository, never()).save(any(Inventory.class));
        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void reserveStock_insufficientStock_throwsInsufficientStockException() {
        inventory.setAvailableQuantity(3);
        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));
        when(reservationRepository.existsByOrderIdAndProductId(ORDER_ID, PRODUCT_ID))
                .thenReturn(false);

        assertThrows(InsufficientStockException.class,
                () -> inventoryService.reserveStock(reserveRequest));

        verify(inventoryRepository, never()).save(any(Inventory.class));
        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void reserveStock_inventoryMissing_throwsInventoryNotFoundException() {
        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.empty());

        assertThrows(InventoryNotFoundException.class,
                () -> inventoryService.reserveStock(reserveRequest));
    }

    // ─── Saga compensation: release ALL RESERVED rows for an order ──────────

    @Test
    void releaseStockForOrder_releasesAllReservedReservations() {
        Inventory itemInventory = Inventory.builder()
                .id(2L)
                .productId(200L)
                .availableQuantity(5)
                .reservedQuantity(2)
                .totalQuantity(10)
                .lastUpdated(LocalDateTime.now())
                .build();

        // inventory (product 100) already has a RESERVED reservation of 3 from res1.
        inventory.setAvailableQuantity(7);
        inventory.setReservedQuantity(3);

        Reservation res1 = Reservation.builder()
                .id(1L)
                .orderId(ORDER_ID)
                .productId(PRODUCT_ID)
                .quantity(3)
                .status(ReservationStatus.RESERVED)
                .createdAt(LocalDateTime.now())
                .build();
        Reservation res2 = Reservation.builder()
                .id(2L)
                .orderId(ORDER_ID)
                .productId(200L)
                .quantity(2)
                .status(ReservationStatus.RESERVED)
                .createdAt(LocalDateTime.now())
                .build();

        when(reservationRepository.findByOrderIdAndStatus(ORDER_ID, ReservationStatus.RESERVED))
                .thenReturn(List.of(res1, res2));
        // releaseStockForOrder locks each inventory row FOR UPDATE as it releases it.
        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));
        when(inventoryRepository.findByProductIdForUpdate(200L))
                .thenReturn(Optional.of(itemInventory));
        when(inventoryRepository.save(any(Inventory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(reservationRepository.save(any(Reservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        inventoryService.releaseStockForOrder(ORDER_ID);

        // Stock restored for both products.
        assertEquals(10, inventory.getAvailableQuantity());
        assertEquals(0, inventory.getReservedQuantity());
        assertEquals(7, itemInventory.getAvailableQuantity());
        assertEquals(0, itemInventory.getReservedQuantity());
        // Both reservations moved to RELEASED.
        assertEquals(ReservationStatus.RELEASED, res1.getStatus());
        assertEquals(ReservationStatus.RELEASED, res2.getStatus());
        verify(reservationRepository, org.mockito.Mockito.times(2))
                .save(any(Reservation.class));
    }

    // ─── Duplicate OrderCancelledEvent: nothing left RESERVED → no-op ───────

    @Test
    void releaseStockForOrder_duplicateCall_isNoOp() {
        when(reservationRepository.findByOrderIdAndStatus(ORDER_ID, ReservationStatus.RESERVED))
                .thenReturn(List.of());

        inventoryService.releaseStockForOrder(ORDER_ID);

        verify(inventoryRepository, never()).save(any(Inventory.class));
        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    // ─── CONFIRMED reservations are never released by compensation ─────────

    @Test
    void releaseStockForOrder_onlyReleasesReservedRows() {
        Reservation confirmed = Reservation.builder()
                .id(9L)
                .orderId(ORDER_ID)
                .productId(PRODUCT_ID)
                .quantity(1)
                .status(ReservationStatus.CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();
        // Repository contract: compensation only selects RESERVED rows.
        when(reservationRepository.findByOrderIdAndStatus(ORDER_ID, ReservationStatus.RESERVED))
                .thenReturn(List.of());

        inventoryService.releaseStockForOrder(ORDER_ID);

        assertEquals(ReservationStatus.CONFIRMED, confirmed.getStatus());
        verify(inventoryRepository, never()).save(any(Inventory.class));
        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // addStock — must use pessimistic lock (findByProductIdForUpdate)
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void addStock_withPessimisticLock_incrementsQuantities() {
        StockRequest request = new StockRequest();
        request.setProductId(PRODUCT_ID);
        request.setQuantity(5);

        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryMapper.toInventoryResponse(any(Inventory.class)))
                .thenReturn(inventoryResponse);

        inventoryService.addStock(request);

        assertEquals(15, inventory.getAvailableQuantity());
        assertEquals(15, inventory.getTotalQuantity());
        // Must lock the row, not use an unlocked lookup
        verify(inventoryRepository).findByProductIdForUpdate(PRODUCT_ID);
        verify(inventoryRepository, never()).findByProductId(PRODUCT_ID);
    }

    @Test
    void addStock_inventoryNotFound_throwsInventoryNotFoundException() {
        StockRequest request = new StockRequest();
        request.setProductId(PRODUCT_ID);
        request.setQuantity(5);

        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.empty());

        assertThrows(InventoryNotFoundException.class,
                () -> inventoryService.addStock(request));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // releaseReservedStock — must use pessimistic lock (findByProductIdForUpdate)
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void releaseReservedStock_withPessimisticLock_restoresQuantities() {
        inventory.setAvailableQuantity(5);
        inventory.setReservedQuantity(5);

        ReserveStockRequest request = ReserveStockRequest.builder()
                .orderId(ORDER_ID)
                .productId(PRODUCT_ID)
                .quantity(3)
                .build();

        InventoryResponse response = InventoryResponse.builder()
                .productId(PRODUCT_ID)
                .availableQuantity(8)
                .reservedQuantity(2)
                .build();

        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryMapper.toInventoryResponse(any(Inventory.class)))
                .thenReturn(response);

        InventoryResponse result = inventoryService.releaseReservedStock(request);

        assertEquals(8, inventory.getAvailableQuantity());
        assertEquals(2, inventory.getReservedQuantity());
        // Must lock the row, not use an unlocked lookup
        verify(inventoryRepository).findByProductIdForUpdate(PRODUCT_ID);
        verify(inventoryRepository, never()).findByProductId(PRODUCT_ID);
    }

    @Test
    void releaseReservedStock_insufficientReservedQuantity_throwsIllegalArgument() {
        inventory.setReservedQuantity(1);

        ReserveStockRequest request = ReserveStockRequest.builder()
                .orderId(ORDER_ID)
                .productId(PRODUCT_ID)
                .quantity(5)
                .build();

        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));

        assertThrows(IllegalArgumentException.class,
                () -> inventoryService.releaseReservedStock(request));
    }

    @Test
    void releaseReservedStock_inventoryNotFound_throwsInventoryNotFoundException() {
        ReserveStockRequest request = ReserveStockRequest.builder()
                .orderId(ORDER_ID)
                .productId(PRODUCT_ID)
                .quantity(3)
                .build();

        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.empty());

        assertThrows(InventoryNotFoundException.class,
                () -> inventoryService.releaseReservedStock(request));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // confirmReservedStock — must use pessimistic lock (findByProductIdForUpdate)
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void confirmReservedStock_withPessimisticLock_convertsReservedToTotal() {
        inventory.setAvailableQuantity(5);
        inventory.setReservedQuantity(5);
        inventory.setTotalQuantity(10);

        ReserveStockRequest request = ReserveStockRequest.builder()
                .orderId(ORDER_ID)
                .productId(PRODUCT_ID)
                .quantity(3)
                .build();

        InventoryResponse response = InventoryResponse.builder()
                .productId(PRODUCT_ID)
                .availableQuantity(5)
                .reservedQuantity(2)
                .build();

        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryMapper.toInventoryResponse(any(Inventory.class)))
                .thenReturn(response);

        inventoryService.confirmReservedStock(request);

        assertEquals(2, inventory.getReservedQuantity());
        assertEquals(7, inventory.getTotalQuantity());
        // Must lock the row, not use an unlocked lookup
        verify(inventoryRepository).findByProductIdForUpdate(PRODUCT_ID);
        verify(inventoryRepository, never()).findByProductId(PRODUCT_ID);
    }

    @Test
    void confirmReservedStock_insufficientReservedQuantity_throwsInsufficientStock() {
        inventory.setReservedQuantity(1);

        ReserveStockRequest request = ReserveStockRequest.builder()
                .orderId(ORDER_ID)
                .productId(PRODUCT_ID)
                .quantity(5)
                .build();

        when(inventoryRepository.findByProductIdForUpdate(PRODUCT_ID))
                .thenReturn(Optional.of(inventory));

        assertThrows(InsufficientStockException.class,
                () -> inventoryService.confirmReservedStock(request));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // createInventory — must be transactional
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void createInventory_newProduct_createsInventory() {
        StockRequest request = new StockRequest();
        request.setProductId(PRODUCT_ID);
        request.setQuantity(10);

        when(inventoryRepository.existsByProductId(PRODUCT_ID)).thenReturn(false);
        when(inventoryRepository.save(any(Inventory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryMapper.toInventoryResponse(any(Inventory.class)))
                .thenReturn(inventoryResponse);

        inventoryService.createInventory(request);

        verify(inventoryRepository).save(any(Inventory.class));
    }

    @Test
    void createInventory_duplicateProduct_throwsInventoryAlreadyExists() {
        StockRequest request = new StockRequest();
        request.setProductId(PRODUCT_ID);
        request.setQuantity(10);

        when(inventoryRepository.existsByProductId(PRODUCT_ID)).thenReturn(true);

        assertThrows(InventoryAlreadyExistsException.class,
                () -> inventoryService.createInventory(request));
    }
}
