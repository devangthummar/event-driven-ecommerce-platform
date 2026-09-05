package com.ecommerce.user.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPrivateKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.math.BigInteger;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.private-key:}")
    private String privateKeyPem;

    @Value("${jwt.private-key-path:}")
    private String privateKeyPath;

    @Value("${jwt.expiration}")
    private long expiration;

    @Value("${jwt.issuer:user-service}")
    private String issuer;

    private PrivateKey privateKey;
    private RSAPublicKey publicKey;

    public String generateToken(CustomUserDetails userDetails) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuer(issuer)
                .issuedAt(now)
                .expiration(expiryDate)
                .claim("role", userDetails.getAuthorities().iterator().next().getAuthority())
                .signWith(privateKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenValid(String token, CustomUserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    private boolean isTokenExpired(String token) {
        try {
            return extractAllClaims(token).getExpiration().before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }

    @PostConstruct
    public void init() {
        try {
            KeyFactory kf = KeyFactory.getInstance("RSA");
            String pemContent = null;

            // Try file path first
            if (privateKeyPath != null && !privateKeyPath.isBlank()) {
                java.nio.file.Path path = java.nio.file.Paths.get(privateKeyPath);
                if (java.nio.file.Files.exists(path)) {
                    pemContent = java.nio.file.Files.readString(path);
                }
            }

            // Fall back to inline PEM
            if (pemContent == null && privateKeyPem != null && !privateKeyPem.isBlank()) {
                pemContent = privateKeyPem;
            }

            if (pemContent != null) {
                String cleaned = pemContent
                        .replaceAll("-----BEGIN (PRIVATE KEY|RSA PRIVATE KEY)-----", "")
                        .replaceAll("-----END (PRIVATE KEY|RSA PRIVATE KEY)-----", "")
                        .replaceAll("\\s", "");
                byte[] keyBytes = Decoders.BASE64.decode(cleaned);
                privateKey = kf.generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
                // Derive public key from private key modulus
                RSAPrivateKeySpec privSpec = kf.getKeySpec(
                        (RSAPrivateKey) privateKey, RSAPrivateKeySpec.class);
                BigInteger mod = privSpec.getModulus();
                BigInteger pubExp = new BigInteger("65537");
                publicKey = (RSAPublicKey) kf.generatePublic(new RSAPublicKeySpec(mod, pubExp));
            } else {
                // Fallback: generate ephemeral keypair (for unit tests)
                KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
                gen.initialize(2048);
                KeyPair kp = gen.generateKeyPair();
                privateKey = kp.getPrivate();
                publicKey = (RSAPublicKey) kp.getPublic();
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize RSA keys for JWT", e);
        }
    }
}