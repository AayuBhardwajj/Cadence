package com.cadence.security.jwt;

import com.cadence.security.config.CadenceSecurityProperties;
import com.cadence.security.exception.InvalidTokenException;
import com.cadence.security.exception.InvalidTokenException.Reason;
import com.cadence.security.exception.SecurityConfigurationException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Header;
import io.jsonwebtoken.IncorrectClaimException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Locator;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.MissingClaimException;
import io.jsonwebtoken.ProtectedHeader;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Validates Supabase JWTs with multi-algorithm support (allowedAlgorithms),
 * JWKS key resolution with caching and throttling, strict header checks,
 * issuer, audience, and signature enforcement.
 * Never performs dynamic algorithm fallback or logs token or key content.
 */
public class JwtValidator {

    private static final Logger log = LoggerFactory.getLogger(JwtValidator.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final List<String> allowedAlgorithms;
    private final String expectedIssuer;
    private final String expectedAudience;
    private final boolean requireSubject;
    private final SecretKey primarySecretKey;
    private final SecretKey secondarySecretKey;
    private final PublicKey primaryPublicKey;
    private final PublicKey secondaryPublicKey;
    private final JwksKeyResolver jwksKeyResolver;
    private final JwtParser primaryParser;
    private final JwtParser secondaryParser;

    public JwtValidator(CadenceSecurityProperties properties) {
        properties.validate();

        CadenceSecurityProperties.JwtProperties jwtProps = properties.getJwt();
        this.allowedAlgorithms = List.copyOf(jwtProps.getAllowedAlgorithms());
        this.expectedIssuer = jwtProps.getIssuer();
        this.expectedAudience = jwtProps.getAudience();
        this.requireSubject = jwtProps.isRequireSubject();

        // Resolve HMAC keys if configured
        boolean hasHmac = allowedAlgorithms.stream()
                .map(JwtAlgorithm::fromString)
                .anyMatch(JwtAlgorithm::isHmac);
        if (hasHmac && hasText(jwtProps.getSecret())) {
            this.primarySecretKey = resolveHmacKey(jwtProps.getSecret());
            this.secondarySecretKey = hasText(jwtProps.getSecondarySecret())
                    ? resolveHmacKey(jwtProps.getSecondarySecret())
                    : null;
        } else {
            this.primarySecretKey = null;
            this.secondarySecretKey = null;
        }

        // Resolve Asymmetric keys / JWKS if configured
        boolean hasAsymmetric = allowedAlgorithms.stream()
                .map(JwtAlgorithm::fromString)
                .anyMatch(JwtAlgorithm::isAsymmetric);
        if (hasAsymmetric) {
            if (hasText(jwtProps.getJwksUrl())) {
                this.jwksKeyResolver = new JwksKeyResolver(
                        jwtProps.getJwksUrl(),
                        jwtProps.getJwksCacheTtlSeconds(),
                        jwtProps.getJwksMinRefreshSeconds()
                );
            } else {
                this.jwksKeyResolver = null;
            }

            if (hasText(jwtProps.getPublicKeyPem())) {
                this.primaryPublicKey = parsePublicKeyPem(jwtProps.getPublicKeyPem());
                this.secondaryPublicKey = hasText(jwtProps.getSecondaryPublicKeyPem())
                        ? parsePublicKeyPem(jwtProps.getSecondaryPublicKeyPem())
                        : null;
            } else {
                this.primaryPublicKey = null;
                this.secondaryPublicKey = null;
            }
        } else {
            this.jwksKeyResolver = null;
            this.primaryPublicKey = null;
            this.secondaryPublicKey = null;
        }

        long skew = jwtProps.getClockSkewSeconds();
        this.primaryParser = buildParser(this::locatePrimaryKey, expectedIssuer, expectedAudience, skew);

        if (this.secondarySecretKey != null || this.secondaryPublicKey != null) {
            this.secondaryParser = buildParser(this::locateSecondaryKey, expectedIssuer, expectedAudience, skew);
            log.info("Initialized JwtValidator with primary and secondary verification keys (rotation active) for algorithms: {}", allowedAlgorithms);
        } else {
            this.secondaryParser = null;
            log.info("Initialized JwtValidator for allowed algorithms: {}", allowedAlgorithms);
        }
    }

    /**
     * Package-private constructor for testing with explicit keys or JWKS resolver.
     */
    JwtValidator(
            List<String> allowedAlgorithms,
            SecretKey primarySecretKey,
            SecretKey secondarySecretKey,
            PublicKey primaryPublicKey,
            PublicKey secondaryPublicKey,
            JwksKeyResolver jwksKeyResolver,
            String issuer,
            String audience,
            long clockSkewSeconds,
            boolean requireSubject
    ) {
        this.allowedAlgorithms = List.copyOf(allowedAlgorithms);
        this.primarySecretKey = primarySecretKey;
        this.secondarySecretKey = secondarySecretKey;
        this.primaryPublicKey = primaryPublicKey;
        this.secondaryPublicKey = secondaryPublicKey;
        this.jwksKeyResolver = jwksKeyResolver;
        this.expectedIssuer = issuer;
        this.expectedAudience = audience;
        this.requireSubject = requireSubject;

        this.primaryParser = buildParser(this::locatePrimaryKey, issuer, audience, clockSkewSeconds);
        if (secondarySecretKey != null || secondaryPublicKey != null) {
            this.secondaryParser = buildParser(this::locateSecondaryKey, issuer, audience, clockSkewSeconds);
        } else {
            this.secondaryParser = null;
        }
    }

    /**
     * Package-private legacy constructor for unit tests passing a single algorithm and Key instances.
     */
    JwtValidator(JwtAlgorithm algorithm, Key primaryKey, Key secondaryKey, String issuer, String audience, long clockSkewSeconds, boolean requireSubject) {
        this.allowedAlgorithms = List.of(algorithm.getStandardName());
        this.expectedIssuer = issuer;
        this.expectedAudience = audience;
        this.requireSubject = requireSubject;
        this.jwksKeyResolver = null;

        if (algorithm.isHmac()) {
            this.primarySecretKey = (SecretKey) primaryKey;
            this.secondarySecretKey = (SecretKey) secondaryKey;
            this.primaryPublicKey = null;
            this.secondaryPublicKey = null;
        } else {
            this.primarySecretKey = null;
            this.secondarySecretKey = null;
            this.primaryPublicKey = (PublicKey) primaryKey;
            this.secondaryPublicKey = (PublicKey) secondaryKey;
        }

        this.primaryParser = buildParser(this::locatePrimaryKey, issuer, audience, clockSkewSeconds);
        if (secondaryKey != null) {
            this.secondaryParser = buildParser(this::locateSecondaryKey, issuer, audience, clockSkewSeconds);
        } else {
            this.secondaryParser = null;
        }
    }

    private static JwtParser buildParser(Locator<Key> locator, String issuer, String audience, long clockSkewSeconds) {
        return Jwts.parser()
                .requireIssuer(issuer)
                .requireAudience(audience)
                .clockSkewSeconds(clockSkewSeconds)
                .keyLocator(locator)
                .build();
    }

    private Key locatePrimaryKey(Header header) {
        String algName = header.getAlgorithm();
        if (algName == null || algName.isBlank()) {
            throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Token missing required 'alg' header");
        }
        JwtAlgorithm alg = JwtAlgorithm.fromString(algName);

        if (alg.isHmac()) {
            if (primarySecretKey == null) {
                throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "HMAC key not configured for algorithm " + algName);
            }
            return primarySecretKey;
        } else if (alg.isAsymmetric()) {
            if (jwksKeyResolver != null) {
                String kid = header instanceof ProtectedHeader ph ? ph.getKeyId() : (String) header.get("kid");
                return jwksKeyResolver.locateKey(kid);
            } else if (primaryPublicKey != null) {
                return primaryPublicKey;
            } else {
                throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Asymmetric key not configured for algorithm " + algName);
            }
        }
        throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Unsupported algorithm: " + algName);
    }

    private Key locateSecondaryKey(Header header) {
        String algName = header.getAlgorithm();
        if (algName == null || algName.isBlank()) {
            return null;
        }
        JwtAlgorithm alg = JwtAlgorithm.fromString(algName);

        if (alg.isHmac()) {
            return secondarySecretKey;
        } else if (alg.isAsymmetric()) {
            return secondaryPublicKey;
        }
        return null;
    }

    /**
     * Cryptographically validates a JWT token and returns verified claims.
     * Fails closed on any error without leaking token content.
     */
    public JwtClaims validate(String token) {
        if (token == null || token.isBlank()) {
            throw new InvalidTokenException(Reason.MALFORMED, "Token is null or empty");
        }

        String trimmed = token.trim();

        // 1. Pre-check for unsupported algorithm like 'none', ensure alg in allowedAlgorithms, and verify kid for asymmetric
        extractAndVerifyHeader(trimmed);

        // 2. Parse and verify with primary key (and secondary key on signature mismatch if rotation configured)
        Jws<Claims> jws = parseWithRotation(trimmed);

        Claims payload = jws.getPayload();

        // 3. Extract and validate subject
        String subject = payload.getSubject();
        if (requireSubject && (subject == null || subject.isBlank())) {
            throw new InvalidTokenException(Reason.MISSING_SUBJECT, "Token missing required subject claim");
        }

        UUID userId = null;
        if (subject != null && !subject.isBlank()) {
            try {
                userId = UUID.fromString(subject);
            } catch (IllegalArgumentException e) {
                throw new InvalidTokenException(Reason.INVALID_SUBJECT, "Subject is not a valid UUID");
            }
        }

        String email = payload.get("email", String.class);
        String role = payload.get("role", String.class);
        Instant issuedAt = payload.getIssuedAt() != null ? payload.getIssuedAt().toInstant() : null;
        Instant expiresAt = payload.getExpiration() != null ? payload.getExpiration().toInstant() : null;
        Set<String> audience = payload.getAudience();

        return new JwtClaims(
                userId,
                subject,
                email,
                role,
                payload.getIssuer(),
                audience,
                issuedAt,
                expiresAt,
                payload
        );
    }

    private Jws<Claims> parseWithRotation(String token) {
        try {
            return parseClaims(primaryParser, token);
        } catch (InvalidTokenException e) {
            if (e.getReason() == Reason.BAD_SIGNATURE && secondaryParser != null) {
                // Try secondary verification key for zero-downtime rotation
                try {
                    return parseClaims(secondaryParser, token);
                } catch (InvalidTokenException secEx) {
                    throw secEx;
                }
            }
            throw e;
        }
    }

    private Jws<Claims> parseClaims(JwtParser parser, String token) {
        try {
            return parser.parseSignedClaims(token);
        } catch (InvalidTokenException e) {
            throw e;
        } catch (ExpiredJwtException e) {
            log.debug("JWT token expired");
            throw new InvalidTokenException(Reason.EXPIRED, "Token has expired", e);
        } catch (IncorrectClaimException e) {
            String claimName = e.getClaimName();
            if ("iss".equalsIgnoreCase(claimName)) {
                log.debug("JWT issuer mismatch");
                throw new InvalidTokenException(Reason.INVALID_ISSUER, "Token issuer mismatch", e);
            } else if ("aud".equalsIgnoreCase(claimName)) {
                log.debug("JWT audience mismatch");
                throw new InvalidTokenException(Reason.INVALID_AUDIENCE, "Token audience mismatch", e);
            }
            log.debug("JWT claim mismatch");
            throw new InvalidTokenException(Reason.MALFORMED, "Invalid claim: " + claimName, e);
        } catch (MissingClaimException e) {
            String claimName = e.getClaimName();
            if ("iss".equalsIgnoreCase(claimName)) {
                log.debug("JWT missing required issuer claim");
                throw new InvalidTokenException(Reason.INVALID_ISSUER, "Missing required issuer claim", e);
            } else if ("aud".equalsIgnoreCase(claimName)) {
                log.debug("JWT missing required audience claim");
                throw new InvalidTokenException(Reason.INVALID_AUDIENCE, "Missing required audience claim", e);
            }
            log.debug("JWT missing required claim");
            throw new InvalidTokenException(Reason.MALFORMED, "Missing required claim: " + claimName, e);
        } catch (io.jsonwebtoken.security.SecurityException e) {
            log.debug("JWT signature invalid");
            throw new InvalidTokenException(Reason.BAD_SIGNATURE, "Invalid token signature", e);
        } catch (UnsupportedJwtException e) {
            if (e.getCause() instanceof InvalidTokenException ite) {
                throw ite;
            }
            log.debug("Unsupported JWT token format");
            throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Unsupported JWT", e);
        } catch (MalformedJwtException e) {
            if (e.getCause() instanceof InvalidTokenException ite) {
                throw ite;
            }
            log.debug("Malformed JWT token");
            throw new InvalidTokenException(Reason.MALFORMED, "Malformed token", e);
        } catch (IllegalArgumentException e) {
            if (e.getCause() instanceof InvalidTokenException ite) {
                throw ite;
            }
            throw new InvalidTokenException(Reason.MALFORMED, "Invalid token argument", e);
        }
    }

    private void extractAndVerifyHeader(String token) {
        int firstDot = token.indexOf('.');
        if (firstDot <= 0) {
            throw new InvalidTokenException(Reason.MALFORMED, "Malformed token structure");
        }
        String headerB64 = token.substring(0, firstDot);
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(headerB64);
            JsonNode node = OBJECT_MAPPER.readTree(decoded);
            if (node == null || !node.has("alg")) {
                throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Token missing required 'alg' header");
            }
            String tokenAlg = node.get("alg").asText().trim();
            if ("none".equalsIgnoreCase(tokenAlg)) {
                throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Algorithm 'none' is forbidden");
            }

            boolean isAllowed = false;
            for (String allowed : allowedAlgorithms) {
                if (allowed.equalsIgnoreCase(tokenAlg)) {
                    isAllowed = true;
                    break;
                }
            }
            if (!isAllowed) {
                log.warn("Rejected JWT with algorithm mismatch: allowed {}, received {}", allowedAlgorithms, tokenAlg);
                throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Token algorithm does not match expected algorithm");
            }

            JwtAlgorithm alg = JwtAlgorithm.fromString(tokenAlg);
            if (alg.isAsymmetric()) {
                if (!node.has("kid") || node.get("kid").asText().isBlank()) {
                    log.warn("Rejected JWT: asymmetric algorithm {} requires 'kid' header", alg);
                    throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Asymmetric token missing required 'kid' header");
                }
            }
        } catch (InvalidTokenException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidTokenException(Reason.MALFORMED, "Invalid or unparseable token header", e);
        }
    }

    private static SecretKey resolveHmacKey(String secret) {
        byte[] rawBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(rawBytes);
    }

    private static PublicKey parsePublicKeyPem(String pem) {
        try {
            String normalized = pem.replace("\\n", "\n");
            String sanitized = normalized.replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(sanitized);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);

            // Attempt EC then RSA
            try {
                return KeyFactory.getInstance("EC").generatePublic(spec);
            } catch (Exception ecEx) {
                return KeyFactory.getInstance("RSA").generatePublic(spec);
            }
        } catch (Exception e) {
            throw new SecurityConfigurationException("Failed to parse public key PEM", e);
        }
    }

    private static boolean hasText(String str) {
        return str != null && !str.isBlank();
    }

    public List<String> getAllowedAlgorithms() {
        return Collections.unmodifiableList(allowedAlgorithms);
    }

    public JwtAlgorithm getConfiguredAlgorithm() {
        return JwtAlgorithm.fromString(allowedAlgorithms.get(0));
    }

    public String getExpectedIssuer() {
        return expectedIssuer;
    }

    public String getExpectedAudience() {
        return expectedAudience;
    }
}
