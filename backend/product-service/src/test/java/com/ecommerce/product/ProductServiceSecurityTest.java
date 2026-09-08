package com.ecommerce.product;

import com.ecommerce.product.config.SecurityConfig;
import com.ecommerce.product.controller.ProductController;
import com.ecommerce.product.security.JwtAuthenticationFilter;
import com.ecommerce.product.service.ProductService;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.util.Date;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * DB-free security slice (@WebMvcTest, mocked ProductService): proves the Product
 * Service RS256 JWT gate AND the ROLE-based authorization matrix without PostgreSQL.
 *
 * <p>Roles match User Service exactly: the JWT {@code role} claim carries the granted
 * authority, i.e. {@code ROLE_USER} / {@code ROLE_ADMIN} (see user-service
 * CustomUserDetails + Role). GET is open to any authenticated user; POST/PUT/DELETE
 * require ROLE_ADMIN.
 */
@WebMvcTest(ProductController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class ProductServiceSecurityTest {

    private static final String ISSUER = "user-service";

    private static KeyPair keyPair;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private ProductService productService;

    @BeforeAll
    static void generateTestKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        keyPair = generator.generateKeyPair();
    }

    @BeforeEach
    void injectPublicKeyIntoFilter() {
        ReflectionTestUtils.setField(jwtAuthenticationFilter, "publicKey",
                (RSAPublicKey) keyPair.getPublic());
    }

    private static String buildToken(String issuer, Date issuedAt, Date expiration, String role) {
        return Jwts.builder()
                .subject("user@example.com")
                .issuer(issuer)
                .issuedAt(issuedAt)
                .expiration(expiration)
                .claim("role", role)
                .signWith(keyPair.getPrivate())
                .compact();
    }

    private static String userToken() {
        long now = System.currentTimeMillis();
        return buildToken(ISSUER, new Date(now - 60_000), new Date(now + 3_600_000), "ROLE_USER");
    }

    private static String adminToken() {
        long now = System.currentTimeMillis();
        return buildToken(ISSUER, new Date(now - 60_000), new Date(now + 3_600_000), "ROLE_ADMIN");
    }

    private static String expiredToken() {
        long now = System.currentTimeMillis();
        return buildToken(ISSUER, new Date(now - 3_600_000), new Date(now - 60_000), "ROLE_ADMIN");
    }

    private static String wrongIssuerToken() {
        long now = System.currentTimeMillis();
        return buildToken("evil-issuer", new Date(now - 60_000), new Date(now + 3_600_000), "ROLE_ADMIN");
    }

    // ─── Unauthenticated / malformed tokens → 401 ─────────────────────────

    @Test
    void requestWithoutToken_isRejected() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requestWithInvalidToken_isRejected() throws Exception {
        mockMvc.perform(get("/api/products")
                        .header("Authorization", "Bearer not-a-real-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requestWithTamperedToken_isRejected() throws Exception {
        String tampered = userToken() + "x";
        mockMvc.perform(get("/api/products")
                        .header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requestWithExpiredToken_isRejected() throws Exception {
        mockMvc.perform(get("/api/products")
                        .header("Authorization", "Bearer " + expiredToken()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requestWithWrongIssuer_isRejected() throws Exception {
        mockMvc.perform(get("/api/products")
                        .header("Authorization", "Bearer " + wrongIssuerToken()))
                .andExpect(status().isUnauthorized());
    }

    // ─── ROLE_USER: reads allowed, mutations forbidden (403) ───────────────

    @Test
    void userRole_canRead() throws Exception {
        when(productService.getAllProducts()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/products")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isOk());
    }

    @Test
    void userRole_canReadSingleProduct() throws Exception {
        when(productService.getProductById(1L))
                .thenReturn(com.ecommerce.product.dto.response.ProductResponseDTO.builder().build());

        mockMvc.perform(get("/api/products/1")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isOk());
    }

    private static final String VALID_PRODUCT_BODY =
            "{\"name\":\"iPhone 15\",\"price\":999.99,\"stockQuantity\":10}";

    @Test
    void userRole_cannotCreateProduct() throws Exception {
        // Valid body: the ONLY reason this can fail is the missing ADMIN role.
        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + userToken())
                        .contentType("application/json")
                        .content(VALID_PRODUCT_BODY))
                .andExpect(status().isForbidden());

        verify(productService, never()).createProduct(any());
    }

    @Test
    void userRole_cannotUpdateProduct() throws Exception {
        mockMvc.perform(put("/api/products/1")
                        .header("Authorization", "Bearer " + userToken())
                        .contentType("application/json")
                        .content(VALID_PRODUCT_BODY))
                .andExpect(status().isForbidden());

        verify(productService, never()).updateProduct(org.mockito.ArgumentMatchers.anyLong(), any());
    }

    @Test
    void userRole_cannotDeleteProduct() throws Exception {
        mockMvc.perform(delete("/api/products/1")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isForbidden());

        verify(productService, never()).deleteProduct(org.mockito.ArgumentMatchers.anyLong());
    }

    // ─── ROLE_ADMIN: reads AND mutations allowed ───────────────────────────

    @Test
    void adminRole_canRead() throws Exception {
        when(productService.getAllProducts()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/products")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void adminRole_canCreateProduct() throws Exception {
        when(productService.createProduct(any()))
                .thenReturn(com.ecommerce.product.dto.response.ProductResponseDTO.builder().build());

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType("application/json")
                        .content(VALID_PRODUCT_BODY))
                .andExpect(status().isCreated());

        verify(productService, org.mockito.Mockito.times(1)).createProduct(any());
    }

    @Test
    void adminRole_canUpdateProduct() throws Exception {
        when(productService.updateProduct(org.mockito.ArgumentMatchers.eq(1L), any()))
                .thenReturn(com.ecommerce.product.dto.response.ProductResponseDTO.builder().build());

        mockMvc.perform(put("/api/products/1")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType("application/json")
                        .content(VALID_PRODUCT_BODY))
                .andExpect(status().isOk());

        verify(productService, org.mockito.Mockito.times(1)).updateProduct(org.mockito.ArgumentMatchers.eq(1L), any());
    }

    // ─── Validation runs AFTER authorization: an admin with a malformed body → 400 ──

    @Test
    void adminRole_withInvalidProductBody_gets400Not201() throws Exception {
        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());

        // The empty body must be rejected by bean validation BEFORE reaching the service.
        verify(productService, never()).createProduct(any());
    }

    @Test
    void adminRole_withMalformedJson_gets400() throws Exception {
        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType("application/json")
                        .content("{not json"))
                .andExpect(status().isBadRequest());

        verify(productService, never()).createProduct(any());
    }

    @Test
    void adminRole_canDeleteProduct() throws Exception {
        mockMvc.perform(delete("/api/products/1")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isNoContent());

        verify(productService, org.mockito.Mockito.times(1)).deleteProduct(org.mockito.ArgumentMatchers.eq(1L));
    }
}
