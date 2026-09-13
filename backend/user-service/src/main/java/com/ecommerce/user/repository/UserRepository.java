package com.ecommerce.user.repository;

import com.ecommerce.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * The {@code users.phone_number} column is also UNIQUE. Pre-checking it lets the
     * client show a field-level conflict instead of a generic server error.
     */
    boolean existsByPhoneNumber(String phoneNumber);

}