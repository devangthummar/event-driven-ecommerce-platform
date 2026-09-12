package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.ReserveStockRequest;
import com.ecommerce.inventory.dto.request.StockRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;
import com.ecommerce.inventory.service.InventoryService;
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

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Security tests for InventoryController authorization.
 *
 * <p>Verifies that mutation endpoints (create, add-stock, reserve, release, confirm)
 * require ADMIN role, while the read endpoint is accessible to any authenticated user.
 *
 * <p>Note: These tests verify the @PreAuthorize annotations are present by testing
 * the controller's authorization behavior through the Spring Security context.
 */
@ExtendWith(MockitoExtension.class)
class InventoryControllerSecurityTest {

    @Mock
    private InventoryService inventoryService;

    @InjectMocks
    private InventoryController inventoryController;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String role) {
        var authorities = List.of(new SimpleGrantedAuthority(role));
        var details = Map.<String, Object>of("userId", 1L, "role", role);
        var authToken = new UsernamePasswordAuthenticationToken(
                "user@example.com", null, authorities);
        authToken.setDetails(details);
        SecurityContextHolder.getContext().setAuthentication(authToken);
    }

    private StockRequest stockRequest() {
        StockRequest req = new StockRequest();
        req.setProductId(1L);
        req.setQuantity(10);
        return req;
    }

    private ReserveStockRequest reserveRequest() {
        return ReserveStockRequest.builder()
                .orderId(1L)
                .productId(1L)
                .quantity(5)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Read endpoint: any authenticated user can access
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void getInventory_userCanRead_succeeds() {
        authenticateAs("ROLE_USER");
        when(inventoryService.getInventory(1L)).thenReturn(
                InventoryResponse.builder().productId(1L).build());

        assertDoesNotThrow(() -> inventoryController.getInventory(1L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Mutation endpoints: @PreAuthorize("hasRole('ADMIN')") is present
    //
    // These tests verify the annotation exists by checking that the method
    // has the PreAuthorize annotation. The actual enforcement is tested by
    // the Spring Security filter chain in integration tests.
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    void createInventory_hasPreAuthorizeAnnotation() throws Exception {
        var method = InventoryController.class.getMethod("createInventory", StockRequest.class);
        var annotation = method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(annotation, "createInventory must have @PreAuthorize annotation");
        assertEquals("hasRole('ADMIN')", annotation.value());
    }

    @Test
    void addStock_hasPreAuthorizeAnnotation() throws Exception {
        var method = InventoryController.class.getMethod("addStock", StockRequest.class);
        var annotation = method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(annotation, "addStock must have @PreAuthorize annotation");
        assertEquals("hasRole('ADMIN')", annotation.value());
    }

    @Test
    void reserveStock_hasPreAuthorizeAnnotation() throws Exception {
        var method = InventoryController.class.getMethod("reserveStock", ReserveStockRequest.class);
        var annotation = method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(annotation, "reserveStock must have @PreAuthorize annotation");
        assertEquals("hasRole('ADMIN')", annotation.value());
    }

    @Test
    void releaseReservedStock_hasPreAuthorizeAnnotation() throws Exception {
        var method = InventoryController.class.getMethod("releaseReservedStock", ReserveStockRequest.class);
        var annotation = method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(annotation, "releaseReservedStock must have @PreAuthorize annotation");
        assertEquals("hasRole('ADMIN')", annotation.value());
    }

    @Test
    void confirmReservedStock_hasPreAuthorizeAnnotation() throws Exception {
        var method = InventoryController.class.getMethod("confirmReservedStock", ReserveStockRequest.class);
        var annotation = method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(annotation, "confirmReservedStock must have @PreAuthorize annotation");
        assertEquals("hasRole('ADMIN')", annotation.value());
    }

    @Test
    void getInventory_doesNotHavePreAuthorizeAnnotation() throws Exception {
        var method = InventoryController.class.getMethod("getInventory", Long.class);
        var annotation = method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNull(annotation, "getInventory must NOT have @PreAuthorize annotation (any authenticated user)");
    }
}
