package com.ecommerce.order.repository;

import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    List<Order> findByUserId(Long userId);

    List<Order> findByStatus(OrderStatus status);

    /**
     * Idempotency replay lookup. Items are fetched eagerly so the returned order can be
     * mapped to a response outside an open session (no web request context in tests).
     */
    @EntityGraph(attributePaths = "orderItems")
    Optional<Order> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);

    /**
     * SELECT ... FOR UPDATE on the order row. Serializes status transitions (REST admin
     * update vs Kafka saga events) so the check-then-set transition validation and the
     * persisted status change are atomic under concurrency. Items are intentionally not
     * fetched here (no collection fetch: PostgreSQL forbids FOR UPDATE on the nullable
     * side of an outer join); callers map the response inside the open transaction, so
     * the lazy collection is still resolvable.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

}
