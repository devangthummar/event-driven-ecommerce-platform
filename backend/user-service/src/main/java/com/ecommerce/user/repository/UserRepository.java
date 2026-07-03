package com.ecommerce.user.repository;

import com.ecommerce.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Service
    User user = repository.findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found"));

    boolean existsByEmail(String email);

}