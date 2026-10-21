package com.cadence.security.test;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.Jwks;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

/**
 * Reusable JWT and key generator for Cadence tests across all services.
 * Supports both HS256 (HMAC) and ES256 (ECDSA P-256) token generation,
 * JWKS JSON representation, and key serialization.
 */
public final class JwtTestTokenHelper {

    public static final String DEFAULT_HMAC_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    public static final String DEFAULT_ISSUER = "https://auth.test.cadence.ai/auth/v1";
    public static final String DEFAULT_AUDIENCE = "authenticated";
    public static final String DEFAULT_EC_KID = "test-ec-kid-1";

    public static final String TEST_EC_PUBLIC_KEY_PEM =
            "-----BEGIN PUBLIC KEY-----\n" +
            "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEvXV2m2/6hqyGdfJwTbSKXTZpP3E8\n" +
            "8l8mvTD6eMtGjVJzT7Qcf8zKvaWDFTPiS3ShCs4Rc4ShW7lsTaYpZdRaYQ==\n" +
            "-----END PUBLIC KEY-----";

    public static final String TEST_EC_PRIVATE_KEY_PEM =
            "-----BEGIN PRIVATE KEY-----\n" +
            "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg2yGEEprOLCfyUmvu\n" +
            "TshXgo34/DUldzPSlWwrVMI76HKhRANCAAS9dXabb/qGrIZ18nBNtIpdNmk/cTzy\n" +
            "Xya9MPp4y0aNUnNPtBx/zMq9pYMVM+JLdKEKzhFzhKFbuWxNpill1Fph\n" +
            "-----END PRIVATE KEY-----";

    private JwtTestTokenHelper() {}

    public static KeyPair generateEcKeyPair() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
            kpg.initialize(new ECGenParameterSpec("secp256r1"));
            return kpg.generateKeyPair();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate EC key pair", e);
        }
    }

    public static PrivateKey parseEcPrivateKey(String pem) {
        try {
            String sanitized = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(sanitized);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
            return KeyFactory.getInstance("EC").generatePrivate(spec);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse EC private key PEM", e);
        }
    }

    public static PublicKey parsePublicKeyPem(String pem, String keyAlgorithm) {
        try {
            String sanitized = pem.replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(sanitized);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
            return KeyFactory.getInstance(keyAlgorithm).generatePublic(spec);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse " + keyAlgorithm + " public key PEM", e);
        }
    }

    public static PrivateKey getDefaultEcPrivateKey() {
        return parseEcPrivateKey(TEST_EC_PRIVATE_KEY_PEM);
    }

    public static PublicKey getDefaultEcPublicKey() {
        return parsePublicKeyPem(TEST_EC_PUBLIC_KEY_PEM, "EC");
    }

    public static String createHmacToken(
            UUID userId,
            String email,
            String role,
            String issuer,
            String audience,
            String secret,
            long expirySeconds
    ) {
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .issuer(issuer)
                .audience().add(audience).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirySeconds, ChronoUnit.SECONDS)))
                .signWith(key, Jwts.SIG.HS256);

        if (userId != null) {
            builder.subject(userId.toString());
        }
        if (email != null) {
            builder.claim("email", email);
        }
        if (role != null) {
            builder.claim("role", role);
        }

        return builder.compact();
    }

    public static String createDefaultHmacToken(UUID userId, String email, String role) {
        return createHmacToken(userId, email, role, DEFAULT_ISSUER, DEFAULT_AUDIENCE, DEFAULT_HMAC_SECRET, 3600);
    }

    public static String createEcToken(
            UUID userId,
            String email,
            String role,
            String issuer,
            String audience,
            PrivateKey privateKey,
            String kid,
            long expirySeconds
    ) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .header().keyId(kid).and()
                .issuer(issuer)
                .audience().add(audience).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirySeconds, ChronoUnit.SECONDS)))
                .signWith(privateKey, Jwts.SIG.ES256);

        if (userId != null) {
            builder.subject(userId.toString());
        }
        if (email != null) {
            builder.claim("email", email);
        }
        if (role != null) {
            builder.claim("role", role);
        }

        return builder.compact();
    }

    public static String createDefaultEcToken(UUID userId, String email, String role) {
        return createEcToken(
                userId,
                email,
                role,
                DEFAULT_ISSUER,
                DEFAULT_AUDIENCE,
                getDefaultEcPrivateKey(),
                DEFAULT_EC_KID,
                3600
        );
    }

    public static String toJwksJson(String kid, PublicKey publicKey) {
        if (!(publicKey instanceof ECPublicKey ecPublicKey)) {
            throw new IllegalArgumentException("Only ECPublicKey supported for test JWKS generator");
        }
        var jwk = Jwks.builder().key(ecPublicKey).id(kid).build();
        String jwkJson = Jwks.json(jwk);
        return "{\"keys\":[" + jwkJson + "]}";
    }
}
