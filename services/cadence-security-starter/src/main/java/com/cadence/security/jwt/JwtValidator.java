package com.cadence.security.jwt;

import com.cadence.security.config.CadenceSecurityProperties;
import com.cadence.security.exception.InvalidTokenException;
import com.cadence.security.exception.InvalidTokenException.Reason;
import com.cadence.security.exception.SecurityConfigurationException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.IncorrectClaimException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.MissingClaimException;
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
import java.util.Set;
import java.util.UUID;

/**
 * Validates Supabase JWTs with strict algorithm matching, issuer, audience, and signature enforcement.
 * Never performs dynamic algorithm fallback or logs token or key content.
 */
public class JwtValidator {

    private static final Logger log = LoggerFactory.getLogger(JwtValidator.class);

    private final JwtAlgorithm configuredAlgorithm;
    private final String expectedIssuer;
    private final String expectedAudience;
    private final boolean requireSubject;
    private final JwtParser primaryParser;
    private final JwtParser secondaryParser; // For zero-downtime key rotation

    public JwtValidator(CadenceSecurityProperties properties) {
        properties.validate();

        CadenceSecurityProperties.JwtProperties jwtProps = properties.getJwt();
        this.configuredAlgorithm = JwtAlgorithm.fromString(jwtProps.getAlgorithm());
        this.expectedIssuer = jwtProps.getIssuer();
        this.expectedAudience = jwtProps.getAudience();
        this.requireSubject = jwtProps.isRequireSubject();

        Key primaryKey = resolveKey(configuredAlgorithm, jwtProps.getSecret(), jwtProps.getPublicKeyPem());
        this.primaryParser = buildParser(primaryKey, expectedIssuer, expectedAudience, jwtProps.getClockSkewSeconds());

        if (hasText(jwtProps.getSecondarySecret()) || hasText(jwtProps.getSecondaryPublicKeyPem())) {
            Key secKey = resolveKey(configuredAlgorithm, jwtProps.getSecondarySecret(), jwtProps.getSecondaryPublicKeyPem());
            this.secondaryParser = buildParser(secKey, expectedIssuer, expectedAudience, jwtProps.getClockSkewSeconds());
            log.info("Initialized JwtValidator with primary and secondary verification keys (rotation active)");
        } else {
            this.secondaryParser = null;
            log.info("Initialized JwtValidator for algorithm: {}", configuredAlgorithm);
        }
    }

    /**
     * Package-private constructor for isolated unit testing with explicit keys.
     */
    JwtValidator(JwtAlgorithm algorithm, Key primaryKey, Key secondaryKey, String issuer, String audience, long clockSkewSeconds, boolean requireSubject) {
        this.configuredAlgorithm = algorithm;
        this.expectedIssuer = issuer;
        this.expectedAudience = audience;
        this.requireSubject = requireSubject;
        this.primaryParser = buildParser(primaryKey, issuer, audience, clockSkewSeconds);
        this.secondaryParser = secondaryKey != null ? buildParser(secondaryKey, issuer, audience, clockSkewSeconds) : null;
    }

    private static JwtParser buildParser(Key key, String issuer, String audience, long clockSkewSeconds) {
        var builder = Jwts.parser()
                .requireIssuer(issuer)
                .requireAudience(audience)
                .clockSkewSeconds(clockSkewSeconds);

        if (key instanceof SecretKey secretKey) {
            builder.verifyWith(secretKey);
        } else if (key instanceof PublicKey publicKey) {
            builder.verifyWith(publicKey);
        } else {
            throw new SecurityConfigurationException("Verification key must be SecretKey or PublicKey, but was: " + (key != null ? key.getClass().getName() : "null"));
        }

        return builder.build();
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

        // 1. Pre-check for unsupported algorithm like 'none'
        verifyAlgorithmHeader(trimmed);

        // 2. Parse and verify with primary key (and secondary key on signature mismatch if rotation configured)
        Jws<Claims> jws = parseWithRotation(trimmed);

        Claims payload = jws.getPayload();

        // 4. Extract and validate subject
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
                    // Fail closed with signature failure
                    throw secEx;
                }
            }
            throw e;
        }
    }

    private Jws<Claims> parseClaims(JwtParser parser, String token) {
        try {
            return parser.parseSignedClaims(token);
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
            log.debug("Unsupported JWT token format");
            throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Unsupported JWT", e);
        } catch (MalformedJwtException e) {
            log.debug("Malformed JWT token");
            throw new InvalidTokenException(Reason.MALFORMED, "Malformed token", e);
        } catch (IllegalArgumentException e) {
            throw new InvalidTokenException(Reason.MALFORMED, "Invalid token argument", e);
        }
    }

    private static final com.fasterxml.jackson.databind.ObjectMapper OBJECT_MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    private void verifyAlgorithmHeader(String token) {
        int firstDot = token.indexOf('.');
        if (firstDot <= 0) {
            throw new InvalidTokenException(Reason.MALFORMED, "Malformed token structure");
        }
        String headerB64 = token.substring(0, firstDot);
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(headerB64);
            com.fasterxml.jackson.databind.JsonNode node = OBJECT_MAPPER.readTree(decoded);
            if (node == null || !node.has("alg")) {
                throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Token missing required 'alg' header");
            }
            String tokenAlg = node.get("alg").asText().trim();
            if ("none".equalsIgnoreCase(tokenAlg)) {
                throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Algorithm 'none' is forbidden");
            }
            if (!configuredAlgorithm.getStandardName().equalsIgnoreCase(tokenAlg)) {
                log.warn("Rejected JWT with algorithm mismatch: expected {}, received {}", configuredAlgorithm.getStandardName(), tokenAlg);
                throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Token algorithm does not match expected algorithm");
            }
        } catch (InvalidTokenException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidTokenException(Reason.MALFORMED, "Invalid or unparseable token header", e);
        }
    }

    private static Key resolveKey(JwtAlgorithm alg, String secret, String pem) {
        if (alg.isHmac()) {
            byte[] rawBytes = secret.getBytes(StandardCharsets.UTF_8);
            return Keys.hmacShaKeyFor(rawBytes);
        } else if (alg.isRsa()) {
            return parsePublicKeyPem(pem, "RSA");
        } else if (alg.isEc()) {
            return parsePublicKeyPem(pem, "EC");
        }
        throw new SecurityConfigurationException("Unsupported algorithm family: " + alg.getKeyFamily());
    }

    private static PublicKey parsePublicKeyPem(String pem, String keyAlgorithm) {
        try {
            // Handle literal \n escapes from environment variables
            String normalized = pem.replace("\\n", "\n");
            String sanitized = normalized.replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(sanitized);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
            KeyFactory kf = KeyFactory.getInstance(keyAlgorithm);
            return kf.generatePublic(spec);
        } catch (Exception e) {
            throw new SecurityConfigurationException("Failed to parse " + keyAlgorithm + " public key PEM", e);
        }
    }

    private static boolean hasText(String str) {
        return str != null && !str.isBlank();
    }

    public JwtAlgorithm getConfiguredAlgorithm() {
        return configuredAlgorithm;
    }

    public String getExpectedIssuer() {
        return expectedIssuer;
    }

    public String getExpectedAudience() {
        return expectedAudience;
    }
}
