package com.ecommerce.order.controller;

import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.mapper.OrderMapper;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.service.OrderService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Security tests for OrderController authorization logic.
 *
 * <p>Tests the ownership enforcement by setting up the SecurityContext with
 * different authenticated identities and verifying that:
 * <ul>
 *   <li>USER can only access their own orders</li>
 *   <li>ADMIN can access any order</li>
 *   <li>Unauthenticated users cannot access orders</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class OrderControllerSecurityTest {

    @Mock
    private OrderService orderService;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderMapper orderMapper;

    @InjectMocks
    private OrderController orderController;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(Long userId, String role) {
        var authorities = List.of(new SimpleGrantedAuthority(role));
        var details = Map.<String, Object>of("userId", userId, "role", role);
        var authToken = new UsernamePasswordAuthenticationToken(
                "user" + userId + "@example.com", null, authorities);
        authToken.setDetails(details);
        SecurityContextHolder.getContext().setAuthentication(authToken);
    }

    private Order orderOwnedBy(Long userId) {
        return Order.builder()
                .id(userId == 1L ? 1L : 2L)
                .userId(userId)
                .orderNumber("ORD-TEST000" + userId)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("100.00"))
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // A. User can retrieve own orders
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getOrdersByUserId_ownOrders_succeeds() {
        authenticateAs(1L, "ROLE_USER");
        when(orderService.getOrdersByUserId(1L)).thenReturn(List.of());

        assertDoesNotThrow(() -> orderController.getOrdersByUserId(1L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // B. User cannot retrieve another user's orders
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getOrdersByUserId_otherUsersOrders_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");

        assertThrows(AccessDeniedException.class,
                () -> orderController.getOrdersByUserId(2L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // C. ADMIN can retrieve another user's orders
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getOrdersByUserId_adminCanAccessAny_succeeds() {
        authenticateAs(1L, "ROLE_ADMIN");
        when(orderService.getOrdersByUserId(2L)).thenReturn(List.of());

        assertDoesNotThrow(() -> orderController.getOrdersByUserId(2L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // D. Unauthenticated request is rejected
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getOrdersByUserId_noAuth_throwsAccessDenied() {
        // No authentication set up
        assertThrows(AccessDeniedException.class,
                () -> orderController.getOrdersByUserId(1L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // E. User can get own order by ID
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getOrderById_ownOrder_succeeds() {
        authenticateAs(1L, "ROLE_USER");
        Order order = orderOwnedBy(1L);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderService.getOrderById(1L)).thenReturn(
                new com.ecommerce.order.dto.response.OrderResponse());

        assertDoesNotThrow(() -> orderController.getOrderById(1L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F. User cannot get another user's order by ID
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getOrderById_otherUsersOrder_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");
        Order order = orderOwnedBy(2L);
        when(orderRepository.findById(2L)).thenReturn(Optional.of(order));

        assertThrows(AccessDeniedException.class,
                () -> orderController.getOrderById(2L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // G. ADMIN can get any order by ID
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getOrderById_adminCanAccessAny_succeeds() {
        authenticateAs(1L, "ROLE_ADMIN");
        Order order = orderOwnedBy(2L);
        when(orderRepository.findById(2L)).thenReturn(Optional.of(order));
        when(orderService.getOrderById(2L)).thenReturn(
                new com.ecommerce.order.dto.response.OrderResponse());

        assertDoesNotThrow(() -> orderController.getOrderById(2L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // H. User cannot create order for another user
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void createOrder_forAnotherUser_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");
        var request = new com.ecommerce.order.dto.request.CreateOrderRequest();
        request.setUserId(2L);
        request.setItems(List.of());

        assertThrows(AccessDeniedException.class,
                () -> orderController.createOrder(request));
    }

    @Test
    void createOrder_forSelf_succeeds() {
        authenticateAs(1L, "ROLE_USER");
        var request = new com.ecommerce.order.dto.request.CreateOrderRequest();
        request.setUserId(1L);
        request.setItems(List.of());
        when(orderService.createOrder(any())).thenReturn(
                new com.ecommerce.order.dto.response.OrderResponse());

        assertDoesNotThrow(() -> orderController.createOrder(request));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // I. Status update requires ADMIN
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void updateOrderStatus_userCannotUpdate_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");

        assertThrows(AccessDeniedException.class,
                () -> orderController.updateOrderStatus(1L,
                        new com.ecommerce.order.dto.request.UpdateOrderStatusRequest(OrderStatus.SHIPPED)));
    }

    @Test
    void updateOrderStatus_adminCanUpdate_succeeds() {
        authenticateAs(1L, "ROLE_ADMIN");
        when(orderService.updateOrderStatus(any(), any())).thenReturn(
                new com.ecommerce.order.dto.response.OrderResponse());

        assertDoesNotThrow(() -> orderController.updateOrderStatus(1L,
                new com.ecommerce.order.dto.request.UpdateOrderStatusRequest(OrderStatus.SHIPPED)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // J. Delete requires ownership or ADMIN
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void deleteOrder_ownOrder_succeeds() {
        authenticateAs(1L, "ROLE_USER");
        Order order = orderOwnedBy(1L);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertDoesNotThrow(() -> orderController.deleteOrder(1L));
    }

    @Test
    void deleteOrder_otherUsersOrder_throwsAccessDenied() {
        authenticateAs(1L, "ROLE_USER");
        Order order = orderOwnedBy(2L);
        when(orderRepository.findById(2L)).thenReturn(Optional.of(order));

        assertThrows(AccessDeniedException.class,
                () -> orderController.deleteOrder(2L));
    }

    @Test
    void deleteOrder_adminCanDeleteAny_succeeds() {
        authenticateAs(1L, "ROLE_ADMIN");
        Order order = orderOwnedBy(2L);
        when(orderRepository.findById(2L)).thenReturn(Optional.of(order));

        assertDoesNotThrow(() -> orderController.deleteOrder(2L));
    }
}
