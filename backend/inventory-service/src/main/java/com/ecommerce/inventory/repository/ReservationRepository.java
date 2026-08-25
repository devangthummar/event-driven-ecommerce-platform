package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.Reservation;
import com.ecommerce.inventory.entity.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByOrderIdAndStatus(Long orderId, ReservationStatus status);

    Optional<Reservation> findByOrderIdAndProductIdAndStatus(Long orderId, Long productId, ReservationStatus status);

}
