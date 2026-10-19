package com.cadence.security.jwt;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Immutable value object holding cryptographically verified JWT claims.
 */
public record JwtClaims(
        UUID userId,
        String subject,
        String email,
        String role,
        String issuer,
        Set<String> audience,
        Instant issuedAt,
        Instant expiresAt,
        Map<String, Object> allClaims
) {
    public JwtClaims {
        audience = audience == null ? Set.of() : Collections.unmodifiableSet(audience);
        allClaims = allClaims == null ? Map.of() : Collections.unmodifiableMap(allClaims);
    }
}
