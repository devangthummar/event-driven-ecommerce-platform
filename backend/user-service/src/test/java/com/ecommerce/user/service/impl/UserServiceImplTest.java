package com.ecommerce.user.service.impl;

import com.ecommerce.user.dto.request.RegisterRequest;
import com.ecommerce.user.entity.Role;
import com.ecommerce.user.entity.User;
import com.ecommerce.user.exception.EmailAlreadyExistsException;
import com.ecommerce.user.mapper.UserMapper;
import com.ecommerce.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Registration race: two concurrent registrations with the same email can both slip
 * past the existsByEmail pre-check; the loser's insert then violates the users.email
 * UNIQUE constraint and must surface as EmailAlreadyExistsException (409), never as an
 * opaque 500.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private com.ecommerce.user.security.JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserMapper userMapper;

    private UserServiceImpl userService;

    private static final String EMAIL = "race@example.com";

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository, passwordEncoder, jwtService,
                authenticationManager, userMapper);
    }

    private RegisterRequest request() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(EMAIL);
        request.setPassword("Password123!");
        request.setFirstName("Racing");
        request.setLastName("User");
        return request;
    }

    @Test
    void registerUser_whenInsertLosesEmailRace_throwsEmailAlreadyExists() {
        // First call (pre-check) misses; the second call (re-check inside the catch,
        // after the concurrent winner committed) finds the email taken.
        when(userRepository.existsByEmail(EMAIL)).thenReturn(false, true);
        User mapped = User.builder()
                .email(EMAIL)
                .password("encoded")
                .role(Role.USER)
                .build();
        when(userMapper.toEntity(any(RegisterRequest.class), any(PasswordEncoder.class)))
                .thenReturn(mapped);
        // The concurrent winner committed first; this insert hits the unique constraint.
        when(userRepository.save(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        assertThrows(EmailAlreadyExistsException.class,
                () -> userService.registerUser(request()));
        verify(userRepository, org.mockito.Mockito.times(2)).existsByEmail(EMAIL);
    }

    @Test
    void registerUser_whenConstraintNotFromEmail_rethrows() {
        // Pre-check misses and the re-check also misses → the constraint is not the email.
        when(userRepository.existsByEmail(EMAIL)).thenReturn(false, false);
        User mapped = User.builder()
                .email(EMAIL)
                .password("encoded")
                .role(Role.USER)
                .build();
        when(userMapper.toEntity(any(RegisterRequest.class), any(PasswordEncoder.class)))
                .thenReturn(mapped);
        when(userRepository.save(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"users_phone_key\""));

        assertThrows(DataIntegrityViolationException.class,
                () -> userService.registerUser(request()));
    }
}
