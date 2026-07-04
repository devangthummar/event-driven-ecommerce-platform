package com.ecommerce.user.security;

import io.jsonwebtoken.Claims;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    public String generateToken(CustomUserDetails userDetails) {
        return "";
    }

    public String extractUsername(String token) {
        return "";
    }

    public boolean isTokenValid(String token, CustomUserDetails userDetails) {
        return false;
    }

    public Claims extractAllClaims(String token) {
        return null;
    }

}