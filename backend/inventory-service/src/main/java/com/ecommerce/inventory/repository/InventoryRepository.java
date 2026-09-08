package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByProductId(Long productId);

    boolean existsByProductId(Long productId);

    /**
     * SELECT ... FOR UPDATE on the inventory row. Used by the reservation and release
     * paths so concurrent transactions that touch the same product serialize on the row
     * lock and each one re-reads the freshly committed stock after the lock wait. This
     * eliminates the optimistic-lock spurious failures that occurred when two different
     * orders reserved the same product concurrently with enough stock for both, and it
     * makes racing duplicate OrderCreatedEvent deliveries resolve against committed
     * state instead of failing.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.productId = :productId")
    Optional<Inventory> findByProductIdForUpdate(@Param("productId") Long productId);

}