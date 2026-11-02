package com.example.backend.config;


import io.jsonwebtoken.Jwt;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {
    @Value("${JWT_SECRET:${jwt.secret:}}")
    private String secret;

    public SecretKey getKey(){
        if (secret == null || secret.isBlank()) {
            return Keys.hmacShaKeyFor("fallbackSecretKeyForDevAndTestingOnlyClassSureApp2026!".getBytes());
        }
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            keyBytes = secret.getBytes();
        }
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
    public String generateToken(String email){
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date(now))
                .expiration(new Date(now+1000 * 60 * 60))
                .signWith(getKey())
                .compact();
    }
    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }
    public boolean isTokenValid(String token,String email){
        String tokenemail = extractEmail(token);
        return tokenemail.equals(email);
    }
}
