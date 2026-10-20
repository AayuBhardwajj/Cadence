package com.cadence.security.jwt;

import com.cadence.security.config.CadenceSecurityProperties;
import com.cadence.security.exception.InvalidTokenException;
import com.cadence.security.exception.InvalidTokenException.Reason;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtValidatorTest {

    private static final String TEST_SECRET = "01234567890123456789012345678901"; // 32 bytes (256 bits)
    private static final String SECONDARY_SECRET = "abcdefabcdefabcdefabcdefabcdefab"; // 32 bytes
    private static final String OTHER_SECRET = "99999999999999999999999999999999"; // 32 bytes
    private static final String EXPECTED_ISSUER = "https://test.supabase.co/auth/v1";
    private static final String EXPECTED_AUDIENCE = "authenticated";

    private SecretKey primaryKey;
    private SecretKey secondaryKey;
    private SecretKey otherKey;

    private CadenceSecurityProperties validProperties;
    private JwtValidator validator;

    @BeforeEach
    void setUp() {
        primaryKey = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        secondaryKey = Keys.hmacShaKeyFor(SECONDARY_SECRET.getBytes(StandardCharsets.UTF_8));
        otherKey = Keys.hmacShaKeyFor(OTHER_SECRET.getBytes(StandardCharsets.UTF_8));

        validProperties = new CadenceSecurityProperties();
        validProperties.getJwt().setAlgorithm("HS256");
        validProperties.getJwt().setSecret(TEST_SECRET);
        validProperties.getJwt().setIssuer(EXPECTED_ISSUER);
        validProperties.getJwt().setAudience(EXPECTED_AUDIENCE);
        validProperties.getJwt().setClockSkewSeconds(5);
        validProperties.getInternal().setSecret("internal-service-secret-12345");

        validator = new JwtValidator(validProperties);
    }

    private String createToken(
            SecretKey key,
            String sub,
            String iss,
            String aud,
            Instant issuedAt,
            Instant expiresAt,
            Map<String, Object> extraClaims
    ) {
        var builder = Jwts.builder()
                .issuer(iss)
                .audience().add(aud).and()
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(key, Jwts.SIG.HS256);

        if (sub != null) {
            builder.subject(sub);
        }

        if (extraClaims != null) {
            extraClaims.forEach(builder::claim);
        }

        return builder.compact();
    }

    @Test
    @DisplayName("Valid JWT token verifies successfully and extracts all claims")
    void testValidTokenVerification() {
        UUID expectedUserId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createToken(
                primaryKey,
                expectedUserId.toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                Map.of("email", "learner@cadence.ai", "role", "authenticated")
        );

        JwtClaims claims = validator.validate(token);

        assertNotNull(claims);
        assertEquals(expectedUserId, claims.userId());
        assertEquals("learner@cadence.ai", claims.email());
        assertEquals("authenticated", claims.role());
        assertEquals(EXPECTED_ISSUER, claims.issuer());
        assertTrue(claims.audience().contains(EXPECTED_AUDIENCE));
    }

    @Test
    @DisplayName("Token signed with incorrect key fails signature validation")
    void testWrongSignatureFails() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createToken(
                otherKey,
                userId.toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(token));
        assertEquals(Reason.BAD_SIGNATURE, ex.getReason());
    }

    @Test
    @DisplayName("Token with tampered payload fails signature verification")
    void testTamperedPayloadFails() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createToken(
                primaryKey,
                userId.toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        // Tamper with middle part (payload)
        String[] parts = token.split("\\.");
        assertEquals(3, parts.length);
        String tamperedToken = parts[0] + "." + parts[1] + "tampered" + "." + parts[2];

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(tamperedToken));
        assertEquals(Reason.BAD_SIGNATURE, ex.getReason());
    }

    @Test
    @DisplayName("Expired token fails validation")
    void testExpiredTokenFails() {
        UUID userId = UUID.randomUUID();
        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        String token = createToken(
                primaryKey,
                userId.toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                past.minus(1, ChronoUnit.HOURS),
                past, // expired 2 hours ago
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(token));
        assertEquals(Reason.EXPIRED, ex.getReason());
    }

    @Test
    @DisplayName("Token with mismatched issuer fails validation")
    void testIssuerMismatchFails() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createToken(
                primaryKey,
                userId.toString(),
                "https://malicious-issuer.com/auth/v1",
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(token));
        assertEquals(Reason.INVALID_ISSUER, ex.getReason());
    }

    @Test
    @DisplayName("Token with mismatched audience fails validation")
    void testAudienceMismatchFails() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createToken(
                primaryKey,
                userId.toString(),
                EXPECTED_ISSUER,
                "wrong-audience",
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(token));
        assertEquals(Reason.INVALID_AUDIENCE, ex.getReason());
    }

    @Test
    @DisplayName("Token with algorithm 'none' is strictly rejected")
    void testAlgorithmNoneRejected() {
        // Construct an unsigned token with alg: none
        String header = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0"; // {"alg":"none","typ":"JWT"}
        String payload = "eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODEyMzQiLCJpc3MiOiJodHRwczovL3Rlc3Quc3VwYWJhc2UuY28vYXV0aC92MSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQifQ";
        String unsignedToken = header + "." + payload + ".";

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(unsignedToken));
        assertEquals(Reason.UNSUPPORTED_ALGORITHM, ex.getReason());
    }

    @Test
    @DisplayName("Token signed with HS512 when HS256 is expected is rejected")
    void testAlgorithmMismatchRejected() {
        SecretKey key512 = Keys.hmacShaKeyFor((TEST_SECRET + TEST_SECRET).getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        String token = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer(EXPECTED_ISSUER)
                .audience().add(EXPECTED_AUDIENCE).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(1, ChronoUnit.HOURS)))
                .signWith(key512, Jwts.SIG.HS512)
                .compact();

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(token));
        assertEquals(Reason.UNSUPPORTED_ALGORITHM, ex.getReason());
    }

    @Test
    @DisplayName("Malformed, truncated, and empty tokens fail gracefully")
    void testMalformedTokens() {
        assertThrows(InvalidTokenException.class, () -> validator.validate(null));
        assertThrows(InvalidTokenException.class, () -> validator.validate(""));
        assertThrows(InvalidTokenException.class, () -> validator.validate("   "));
        assertThrows(InvalidTokenException.class, () -> validator.validate("not-a-token"));
        assertThrows(InvalidTokenException.class, () -> validator.validate("abc.def"));
        assertThrows(InvalidTokenException.class, () -> validator.validate("header.payload."));
    }

    @Test
    @DisplayName("Token missing subject claim is rejected")
    void testMissingSubjectRejected() {
        Instant now = Instant.now();
        String token = createToken(
                primaryKey,
                null, // no sub
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(token));
        assertEquals(Reason.MISSING_SUBJECT, ex.getReason());
    }

    @Test
    @DisplayName("Token with non-UUID subject claim is rejected")
    void testInvalidUuidSubjectRejected() {
        Instant now = Instant.now();
        String token = createToken(
                primaryKey,
                "not-a-valid-uuid",
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> validator.validate(token));
        assertEquals(Reason.INVALID_SUBJECT, ex.getReason());
    }

    @Test
    @DisplayName("Key rotation: validator accepts tokens signed with either primary or secondary key")
    void testKeyRotationSupport() {
        CadenceSecurityProperties rotProps = new CadenceSecurityProperties();
        rotProps.getJwt().setAlgorithm("HS256");
        rotProps.getJwt().setSecret(TEST_SECRET);
        rotProps.getJwt().setSecondarySecret(SECONDARY_SECRET);
        rotProps.getJwt().setIssuer(EXPECTED_ISSUER);
        rotProps.getJwt().setAudience(EXPECTED_AUDIENCE);
        rotProps.getInternal().setSecret("internal-service-secret-12345");

        JwtValidator rotatingValidator = new JwtValidator(rotProps);

        UUID user1 = UUID.randomUUID();
        UUID user2 = UUID.randomUUID();
        Instant now = Instant.now();

        // Token signed with primary key
        String token1 = createToken(primaryKey, user1.toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);
        // Token signed with secondary key
        String token2 = createToken(secondaryKey, user2.toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);
        // Token signed with retired/unknown key
        String token3 = createToken(otherKey, UUID.randomUUID().toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);

        // Both primary and secondary pass
        assertEquals(user1, rotatingValidator.validate(token1).userId());
        assertEquals(user2, rotatingValidator.validate(token2).userId());

        // Retired key fails
        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> rotatingValidator.validate(token3));
        assertEquals(Reason.BAD_SIGNATURE, ex.getReason());
    }

    // ---- ES256 (EC P-256) Tests ----

    private java.security.KeyPair generateEcKeyPair() {
        try {
            java.security.KeyPairGenerator kpg = java.security.KeyPairGenerator.getInstance("EC");
            kpg.initialize(new java.security.spec.ECGenParameterSpec("secp256r1"));
            return kpg.generateKeyPair();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String createEcToken(
            java.security.PrivateKey privateKey,
            String sub,
            String iss,
            String aud,
            Instant issuedAt,
            Instant expiresAt,
            Map<String, Object> extraClaims
    ) {
        var builder = Jwts.builder()
                .issuer(iss)
                .audience().add(aud).and()
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(privateKey, Jwts.SIG.ES256);

        if (sub != null) {
            builder.subject(sub);
        }

        if (extraClaims != null) {
            extraClaims.forEach(builder::claim);
        }

        return builder.compact();
    }

    @Test
    @DisplayName("ES256: Valid EC-signed JWT verifies successfully")
    void testEs256ValidToken() {
        java.security.KeyPair kp = generateEcKeyPair();

        JwtValidator ecValidator = new JwtValidator(
                JwtAlgorithm.ES256,
                kp.getPublic(),
                null,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createEcToken(
                kp.getPrivate(),
                userId.toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                Map.of("email", "learner@cadence.ai", "role", "authenticated")
        );

        JwtClaims claims = ecValidator.validate(token);
        assertNotNull(claims);
        assertEquals(userId, claims.userId());
        assertEquals("learner@cadence.ai", claims.email());
        assertEquals("authenticated", claims.role());
    }

    @Test
    @DisplayName("ES256: Token signed with wrong EC key fails signature validation")
    void testEs256WrongKeyFails() {
        java.security.KeyPair kp1 = generateEcKeyPair();
        java.security.KeyPair kp2 = generateEcKeyPair();

        JwtValidator ecValidator = new JwtValidator(
                JwtAlgorithm.ES256,
                kp1.getPublic(),
                null,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createEcToken(
                kp2.getPrivate(), // signed with different key
                userId.toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> ecValidator.validate(token));
        assertEquals(Reason.BAD_SIGNATURE, ex.getReason());
    }

    @Test
    @DisplayName("ES256: HS256 token is rejected when ES256 is configured")
    void testEs256RejectsHmacToken() {
        java.security.KeyPair kp = generateEcKeyPair();

        JwtValidator ecValidator = new JwtValidator(
                JwtAlgorithm.ES256,
                kp.getPublic(),
                null,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        // Create an HS256 token
        Instant now = Instant.now();
        String hmacToken = createToken(
                primaryKey,
                UUID.randomUUID().toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> ecValidator.validate(hmacToken));
        assertEquals(Reason.UNSUPPORTED_ALGORITHM, ex.getReason());
    }
}
