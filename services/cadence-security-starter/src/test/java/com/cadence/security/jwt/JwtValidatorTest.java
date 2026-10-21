package com.cadence.security.jwt;

import com.cadence.security.config.CadenceSecurityProperties;
import com.cadence.security.exception.InvalidTokenException;
import com.cadence.security.exception.InvalidTokenException.Reason;
import com.cadence.security.test.JwtTestTokenHelper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

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
        validProperties.getJwt().setAllowedAlgorithms(List.of("HS256"));
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
                null,
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
        rotProps.getJwt().setAllowedAlgorithms(List.of("HS256"));
        rotProps.getJwt().setSecret(TEST_SECRET);
        rotProps.getJwt().setSecondarySecret(SECONDARY_SECRET);
        rotProps.getJwt().setIssuer(EXPECTED_ISSUER);
        rotProps.getJwt().setAudience(EXPECTED_AUDIENCE);
        rotProps.getInternal().setSecret("internal-service-secret-12345");

        JwtValidator rotatingValidator = new JwtValidator(rotProps);

        UUID user1 = UUID.randomUUID();
        UUID user2 = UUID.randomUUID();
        Instant now = Instant.now();

        String token1 = createToken(primaryKey, user1.toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);
        String token2 = createToken(secondaryKey, user2.toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);
        String token3 = createToken(otherKey, UUID.randomUUID().toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);

        assertEquals(user1, rotatingValidator.validate(token1).userId());
        assertEquals(user2, rotatingValidator.validate(token2).userId());

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> rotatingValidator.validate(token3));
        assertEquals(Reason.BAD_SIGNATURE, ex.getReason());
    }

    // ---- ES256 & Multi-Algorithm Tests ----

    private KeyPair generateEcKeyPair() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
            kpg.initialize(new ECGenParameterSpec("secp256r1"));
            return kpg.generateKeyPair();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String createEcToken(
            PrivateKey privateKey,
            String kid,
            String sub,
            String iss,
            String aud,
            Instant issuedAt,
            Instant expiresAt,
            Map<String, Object> extraClaims
    ) {
        var builder = Jwts.builder();
        if (kid != null) {
            builder.header().keyId(kid).and();
        }
        builder.issuer(iss)
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
    @DisplayName("ES256: Valid EC-signed JWT verifies successfully with kid")
    void testEs256ValidToken() {
        KeyPair kp = generateEcKeyPair();

        JwtValidator ecValidator = new JwtValidator(
                List.of("ES256"),
                null,
                null,
                kp.getPublic(),
                null,
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
                "test-kid",
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
    @DisplayName("ES256: Asymmetric token missing kid is rejected")
    void testEs256MissingKidRejected() {
        KeyPair kp = generateEcKeyPair();

        JwtValidator ecValidator = new JwtValidator(
                List.of("ES256"),
                null,
                null,
                kp.getPublic(),
                null,
                null,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        Instant now = Instant.now();
        String tokenWithoutKid = createEcToken(
                kp.getPrivate(),
                null, // no kid
                UUID.randomUUID().toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> ecValidator.validate(tokenWithoutKid));
        assertEquals(Reason.UNSUPPORTED_ALGORITHM, ex.getReason());
        assertTrue(ex.getMessage().contains("missing required 'kid'"));
    }

    @Test
    @DisplayName("ES256: Token signed with wrong EC key fails signature validation")
    void testEs256WrongKeyFails() {
        KeyPair kp1 = generateEcKeyPair();
        KeyPair kp2 = generateEcKeyPair();

        JwtValidator ecValidator = new JwtValidator(
                List.of("ES256"),
                null,
                null,
                kp1.getPublic(),
                null,
                null,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createEcToken(
                kp2.getPrivate(),
                "kid-1",
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
    @DisplayName("Multi-algorithm: validator configured for [HS256, ES256] accepts both HS256 and ES256 tokens")
    void testMultiAlgorithmAcceptsBothHs256AndEs256() {
        KeyPair kp = generateEcKeyPair();

        JwtValidator dualValidator = new JwtValidator(
                List.of("HS256", "ES256"),
                primaryKey,
                null,
                kp.getPublic(),
                null,
                null,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        UUID userHmac = UUID.randomUUID();
        UUID userEc = UUID.randomUUID();
        Instant now = Instant.now();

        String hmacToken = createToken(primaryKey, userHmac.toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);
        String ecToken = createEcToken(kp.getPrivate(), "kid-ec", userEc.toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);

        assertEquals(userHmac, dualValidator.validate(hmacToken).userId());
        assertEquals(userEc, dualValidator.validate(ecToken).userId());

        // Algorithm not in allowedAlgorithms is rejected
        SecretKey key512 = Keys.hmacShaKeyFor((TEST_SECRET + TEST_SECRET).getBytes(StandardCharsets.UTF_8));
        String token512 = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer(EXPECTED_ISSUER)
                .audience().add(EXPECTED_AUDIENCE).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(1, ChronoUnit.HOURS)))
                .signWith(key512, Jwts.SIG.HS512)
                .compact();

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> dualValidator.validate(token512));
        assertEquals(Reason.UNSUPPORTED_ALGORITHM, ex.getReason());
    }

    @Test
    @DisplayName("Alg-confusion: HS256 signed with EC public key bytes as secret is strictly rejected")
    void testAlgConfusionHs256SignedWithEcPublicKeyAsSecretIsRejected() {
        KeyPair kp = generateEcKeyPair();

        JwtValidator dualValidator = new JwtValidator(
                List.of("HS256", "ES256"),
                primaryKey, // configured secret is TEST_SECRET
                null,
                kp.getPublic(),
                null,
                null,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        // Attacker creates HS256 token signed with the EC public key bytes
        SecretKey confusedHmacKey = Keys.hmacShaKeyFor(kp.getPublic().getEncoded());
        Instant now = Instant.now();
        String confusedToken = createToken(
                confusedHmacKey,
                UUID.randomUUID().toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                null
        );

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> dualValidator.validate(confusedToken));
        assertEquals(Reason.BAD_SIGNATURE, ex.getReason());
    }

    // ---- JWKS Tests ----

    @Test
    @DisplayName("JWKS: Valid ES256 token verifies successfully using local JWKS stub")
    void testEs256ViaLocalJwksStub() {
        KeyPair kp = generateEcKeyPair();
        String kid = "jwks-kid-test-1";
        String jwksJson = JwtTestTokenHelper.toJwksJson(kid, kp.getPublic());

        JwksKeyResolver resolver = new JwksKeyResolver(
                "http://localhost:54321/auth/v1/.well-known/jwks.json",
                600,
                30,
                url -> jwksJson
        );

        JwtValidator jwksValidator = new JwtValidator(
                List.of("ES256"),
                null,
                null,
                null,
                null,
                resolver,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createEcToken(
                kp.getPrivate(),
                kid,
                userId.toString(),
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                now,
                now.plus(1, ChronoUnit.HOURS),
                Map.of("email", "jwks-learner@cadence.ai", "role", "authenticated")
        );

        JwtClaims claims = jwksValidator.validate(token);
        assertNotNull(claims);
        assertEquals(userId, claims.userId());
        assertEquals("jwks-learner@cadence.ai", claims.email());
        assertEquals(1, resolver.getCachedKeyCount());
    }

    @Test
    @DisplayName("JWKS: Unknown kid refetches at most once per minRefreshSeconds (throttling)")
    void testRefreshThrottlingOnUnknownKid() {
        KeyPair kp = generateEcKeyPair();
        String kid = "jwks-known-kid";
        String jwksJson = JwtTestTokenHelper.toJwksJson(kid, kp.getPublic());

        AtomicInteger fetchCount = new AtomicInteger(0);
        JwksKeyResolver resolver = new JwksKeyResolver(
                "http://localhost:54321/auth/v1/.well-known/jwks.json",
                600,
                30, // 30 seconds minimum between unknown-kid refreshes
                url -> {
                    fetchCount.incrementAndGet();
                    return jwksJson;
                }
        );

        JwtValidator jwksValidator = new JwtValidator(
                List.of("ES256"),
                null,
                null,
                null,
                null,
                resolver,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        Instant now = Instant.now();
        // First unknown kid triggers initial fetch and then 1 refresh attempt
        String token1 = createEcToken(kp.getPrivate(), "unknown-kid-1", UUID.randomUUID().toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);
        assertThrows(InvalidTokenException.class, () -> jwksValidator.validate(token1));
        int fetchesAfterFirst = fetchCount.get();
        assertTrue(fetchesAfterFirst >= 1);

        // Immediate second unknown kid should be throttled (no additional HTTP fetch)
        String token2 = createEcToken(kp.getPrivate(), "unknown-kid-2", UUID.randomUUID().toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);
        assertThrows(InvalidTokenException.class, () -> jwksValidator.validate(token2));

        assertEquals(fetchesAfterFirst, fetchCount.get(), "Fetch count must not increase because of 30s throttling");
    }

    @Test
    @DisplayName("JWKS: On fetch failure after TTL expiration, stale cache is served with a warning")
    void testStaleOnErrorWhenCacheExpired() {
        KeyPair kp = generateEcKeyPair();
        String kid = "jwks-stale-kid";
        String jwksJson = JwtTestTokenHelper.toJwksJson(kid, kp.getPublic());

        AtomicInteger fetchCount = new AtomicInteger(0);
        JwksKeyResolver resolver = new JwksKeyResolver(
                "http://localhost:54321/auth/v1/.well-known/jwks.json",
                1, // 1 second TTL
                0,
                url -> {
                    int count = fetchCount.incrementAndGet();
                    if (count > 1) {
                        throw new IOException("Remote JWKS endpoint 500 Internal Error");
                    }
                    return jwksJson;
                }
        );

        JwtValidator jwksValidator = new JwtValidator(
                List.of("ES256"),
                null,
                null,
                null,
                null,
                resolver,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String token = createEcToken(kp.getPrivate(), kid, userId.toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);

        // 1st validation populates cache
        assertEquals(userId, jwksValidator.validate(token).userId());
        assertEquals(1, fetchCount.get());

        // Wait for 1s TTL to expire
        try {
            Thread.sleep(1100);
        } catch (InterruptedException ignored) {}

        // 2nd validation: cache is expired and fetcher throws IOException, but stale cache verifies token
        assertEquals(userId, jwksValidator.validate(token).userId());
        assertEquals(2, fetchCount.get());
    }

    @Test
    @DisplayName("JWKS: If keys were never fetched and fetch fails, validator fails closed")
    void testNeverFetchedFailClosed() {
        KeyPair kp = generateEcKeyPair();
        JwksKeyResolver resolver = new JwksKeyResolver(
                "http://localhost:54321/auth/v1/.well-known/jwks.json",
                600,
                30,
                url -> {
                    throw new IOException("Network connection refused");
                }
        );

        JwtValidator jwksValidator = new JwtValidator(
                List.of("ES256"),
                null,
                null,
                null,
                null,
                resolver,
                EXPECTED_ISSUER,
                EXPECTED_AUDIENCE,
                5,
                true
        );

        Instant now = Instant.now();
        String token = createEcToken(kp.getPrivate(), "kid-1", UUID.randomUUID().toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> jwksValidator.validate(token));
        assertEquals(Reason.BAD_SIGNATURE, ex.getReason());
        assertTrue(ex.getMessage().contains("could not be fetched"));
    }

    @Test
    @DisplayName("JWKS: ES256 token with wrong issuer is rejected")
    void testEs256WrongIssuerRejected() {
        KeyPair kp = generateEcKeyPair();
        String kid = "jwks-kid-iss";
        String jwksJson = JwtTestTokenHelper.toJwksJson(kid, kp.getPublic());
        JwksKeyResolver resolver = new JwksKeyResolver("http://url", 600, 30, u -> jwksJson);

        JwtValidator jwksValidator = new JwtValidator(
                List.of("ES256"),
                null, null, null, null, resolver,
                EXPECTED_ISSUER, EXPECTED_AUDIENCE, 5, true
        );

        Instant now = Instant.now();
        String token = createEcToken(kp.getPrivate(), kid, UUID.randomUUID().toString(), "https://wrong-issuer.com/auth/v1", EXPECTED_AUDIENCE, now, now.plus(1, ChronoUnit.HOURS), null);

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> jwksValidator.validate(token));
        assertEquals(Reason.INVALID_ISSUER, ex.getReason());
    }

    @Test
    @DisplayName("JWKS: ES256 token with wrong audience is rejected")
    void testEs256WrongAudienceRejected() {
        KeyPair kp = generateEcKeyPair();
        String kid = "jwks-kid-aud";
        String jwksJson = JwtTestTokenHelper.toJwksJson(kid, kp.getPublic());
        JwksKeyResolver resolver = new JwksKeyResolver("http://url", 600, 30, u -> jwksJson);

        JwtValidator jwksValidator = new JwtValidator(
                List.of("ES256"),
                null, null, null, null, resolver,
                EXPECTED_ISSUER, EXPECTED_AUDIENCE, 5, true
        );

        Instant now = Instant.now();
        String token = createEcToken(kp.getPrivate(), kid, UUID.randomUUID().toString(), EXPECTED_ISSUER, "wrong-aud", now, now.plus(1, ChronoUnit.HOURS), null);

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> jwksValidator.validate(token));
        assertEquals(Reason.INVALID_AUDIENCE, ex.getReason());
    }

    @Test
    @DisplayName("JWKS: ES256 expired token is rejected")
    void testEs256ExpiredTokenRejected() {
        KeyPair kp = generateEcKeyPair();
        String kid = "jwks-kid-exp";
        String jwksJson = JwtTestTokenHelper.toJwksJson(kid, kp.getPublic());
        JwksKeyResolver resolver = new JwksKeyResolver("http://url", 600, 30, u -> jwksJson);

        JwtValidator jwksValidator = new JwtValidator(
                List.of("ES256"),
                null, null, null, null, resolver,
                EXPECTED_ISSUER, EXPECTED_AUDIENCE, 5, true
        );

        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        String token = createEcToken(kp.getPrivate(), kid, UUID.randomUUID().toString(), EXPECTED_ISSUER, EXPECTED_AUDIENCE, past.minus(1, ChronoUnit.HOURS), past, null);

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> jwksValidator.validate(token));
        assertEquals(Reason.EXPIRED, ex.getReason());
    }
}
