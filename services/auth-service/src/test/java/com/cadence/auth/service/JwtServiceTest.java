package com.cadence.auth.service;

import com.cadence.auth.exception.InvalidTokenException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link JwtService}.
 * These tests generate real HMAC-signed JWTs so the cryptographic path
 * is exercised without any mocking or Spring context.
 */
@SuppressWarnings("deprecation")
class JwtServiceTest {

    /** Shared signing key — created fresh for every test class load */
    private static final SecretKey TEST_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(TEST_KEY);
    }

    // ──────────────────────────────────────────────────────────────────
    // validateAndExtractUserId
    // ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("validateAndExtractUserId: returns subject for a valid token")
    void shouldExtractUserIdFromValidToken() throws InvalidTokenException {
        String userId = UUID.randomUUID().toString();
        String token  = buildToken(userId, null, futureDate());

        String result = jwtService.validateAndExtractUserId(token);

        assertThat(result).isEqualTo(userId);
    }

    @Test
    @DisplayName("validateAndExtractUserId: throws InvalidTokenException for expired token")
    void shouldThrowForExpiredToken() {
        String token = buildToken("user-1", null, pastDate());

        assertThatThrownBy(() -> jwtService.validateAndExtractUserId(token))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("expired");
    }

    @Test
    @DisplayName("validateAndExtractUserId: throws InvalidTokenException for tampered signature")
    void shouldThrowForTamperedSignature() {
        String token = buildToken("user-2", null, futureDate());
        // Flip the last character to break the signature
        String tampered = token.substring(0, token.length() - 1) + "X";

        assertThatThrownBy(() -> jwtService.validateAndExtractUserId(tampered))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    @DisplayName("validateAndExtractUserId: throws InvalidTokenException for malformed token string")
    void shouldThrowForMalformedToken() {
        assertThatThrownBy(() -> jwtService.validateAndExtractUserId("not.a.jwt"))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    @DisplayName("validateAndExtractUserId: throws if sub claim is absent")
    void shouldThrowWhenSubjectIsMissing() {
        // Build token with no subject
        String token = Jwts.builder()
                .setExpiration(futureDate())
                .signWith(TEST_KEY, SignatureAlgorithm.HS256)
                .compact();

        assertThatThrownBy(() -> jwtService.validateAndExtractUserId(token))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("sub");
    }

    // ──────────────────────────────────────────────────────────────────
    // validateAndExtractEmail
    // ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("validateAndExtractEmail: returns email when claim is present")
    void shouldExtractEmailWhenPresent() throws InvalidTokenException {
        String email = "test@cadence.app";
        String token = buildToken(UUID.randomUUID().toString(), email, futureDate());

        assertThat(jwtService.validateAndExtractEmail(token))
                .isPresent()
                .hasValue(email);
    }

    @Test
    @DisplayName("validateAndExtractEmail: returns empty Optional when claim is absent")
    void shouldReturnEmptyWhenEmailAbsent() throws InvalidTokenException {
        String token = buildToken(UUID.randomUUID().toString(), null, futureDate());

        assertThat(jwtService.validateAndExtractEmail(token)).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────────
    // helpers
    // ──────────────────────────────────────────────────────────────────

    private String buildToken(String subject, String email, Date expiry) {
        var builder = Jwts.builder()
                .setSubject(subject)
                .setExpiration(expiry)
                .signWith(TEST_KEY, SignatureAlgorithm.HS256);
        if (email != null) {
            builder.claim("email", email);
        }
        return builder.compact();
    }

    private Date futureDate() {
        return new Date(System.currentTimeMillis() + 60_000L);
    }

    private Date pastDate() {
        return new Date(System.currentTimeMillis() - 60_000L);
    }
}
