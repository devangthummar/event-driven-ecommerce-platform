package com.ecommerce.order.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.SignatureException;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Collections;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Value("${jwt.public-key:}")
    private String publicKeyPem;

    @Value("${jwt.public-key-path:}")
    private String publicKeyPath;

    @Value("${jwt.issuer:}")
    private String expectedIssuer;

    private RSAPublicKey publicKey;

    @PostConstruct
    public void init() {
        try {
            String pemContent = null;

            // Try file path first
            if (publicKeyPath != null && !publicKeyPath.isBlank()) {
                java.nio.file.Path path = java.nio.file.Paths.get(publicKeyPath);
                if (java.nio.file.Files.exists(path)) {
                    pemContent = java.nio.file.Files.readString(path);
                }
            }

            // Fall back to inline PEM
            if (pemContent == null && publicKeyPem != null && !publicKeyPem.isBlank()) {
                pemContent = publicKeyPem;
            }

            if (pemContent != null) {
                String cleaned = pemContent
                        .replaceAll("-----BEGIN PUBLIC KEY-----", "")
                        .replaceAll("-----END PUBLIC KEY-----", "")
                        .replaceAll("\\s", "");
                byte[] keyBytes = java.util.Base64.getDecoder().decode(cleaned);
                KeyFactory kf = KeyFactory.getInstance("RSA");
                publicKey = (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(keyBytes));
            }
        } catch (Exception e) {
            logger.error("Failed to initialize RSA public key for JWT validation", e);
        }
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(publicKey)
                    .build()
                    .parseSignedClaims(jwt)
                    .getPayload();

            // Validate issuer if configured
            if (expectedIssuer != null && !expectedIssuer.isBlank()) {
                String iss = claims.getIssuer();
                if (iss == null || !iss.equals(expectedIssuer)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Invalid token issuer\"}");
                    return;
                }
            }

            String username = claims.getSubject();
            String role = claims.get("role", String.class);

            List<SimpleGrantedAuthority> authorities = List.of();
            if (role != null && !role.isBlank()) {
                authorities = List.of(new SimpleGrantedAuthority(role));
            }

            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                            username, null, authorities);

            authToken.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authToken);

        } catch (ExpiredJwtException e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Token has expired\"}");
            return;
        } catch (SignatureException e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid token signature\"}");
            return;
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid token\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
