package com.cadence.auth.service;

import com.cadence.auth.exception.InvalidTokenException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey verificationKey;

    @org.springframework.beans.factory.annotation.Autowired
    public JwtService(@Value("${jwt.secret}") String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("JWT secret cannot be null or empty");
        }
        // Supabase JWT secret is standard UTF-8
        this.verificationKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /** Package-visible constructor for unit tests that supply a pre-built key. */
    JwtService(SecretKey verificationKey) {
        this.verificationKey = verificationKey;
    }

    private Claims parseClaims(String token) throws InvalidTokenException {
        try {
            return Jwts.parser()
                    .verifyWith(verificationKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw new InvalidTokenException("JWT token has expired", e);
        } catch (SignatureException e) {
            throw new InvalidTokenException("JWT signature validation failed", e);
        } catch (MalformedJwtException e) {
            throw new InvalidTokenException("JWT token is malformed", e);
        } catch (Exception e) {
            throw new InvalidTokenException("JWT token validation failed: " + e.getMessage(), e);
        }
    }

    public String validateAndExtractUserId(String token) throws InvalidTokenException {
        Claims claims = parseClaims(token);
        String userId = claims.getSubject();
        if (userId == null || userId.isBlank()) {
            throw new InvalidTokenException("JWT subject (sub) claim is missing or empty");
        }
        return userId;
    }

    public Optional<String> validateAndExtractEmail(String token) throws InvalidTokenException {
        Claims claims = parseClaims(token);
        String email = claims.get("email", String.class);
        return Optional.ofNullable(email);
    }
}
