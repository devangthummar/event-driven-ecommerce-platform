package com.ecommerce.user.controller;

import com.ecommerce.user.dto.request.ChangePasswordRequest;
import com.ecommerce.user.dto.request.LoginRequest;
import com.ecommerce.user.dto.request.RegisterRequest;
import com.ecommerce.user.dto.request.UpdateProfileRequest;
import com.ecommerce.user.dto.response.LoginResponse;
import com.ecommerce.user.dto.response.UserResponse;
import com.ecommerce.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@Tag(
        name = "User APIs",
        description = "Authentication and User Management"
)


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Register a new user")
    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(
            @Valid @RequestBody RegisterRequest request) {

        UserResponse response = userService.registerUser(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }


    @Operation(summary = "Login user")
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request){

        return ResponseEntity.ok(userService.login(request));

    }


    @GetMapping("/user")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<String> userEndpoint() {
        return ResponseEntity.ok("Welcome USER");
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> adminEndpoint() {
        return ResponseEntity.ok("Welcome ADMIN");
    }


    @Operation(summary = "Get logged-in user")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(){

        return ResponseEntity.ok(
                userService.getCurrentUser());

    }

    @Operation(summary = "Update user profile")
    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(
            @Valid
            @RequestBody UpdateProfileRequest request){

        return ResponseEntity.ok(
                userService.updateProfile(request));

    }

    @Operation(summary = "Change password")
    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(
            @Valid
            @RequestBody ChangePasswordRequest request){

        userService.changePassword(request);

        return ResponseEntity.ok("Password changed successfully.");

    }
}