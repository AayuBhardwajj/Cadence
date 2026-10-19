package com.cadence.security.config;

import com.cadence.security.exception.SecurityConfigurationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CadenceSecurityPropertiesTest {

    private static final String VALID_SECRET_32_BYTES = "01234567890123456789012345678901";
    private static final String VALID_INTERNAL_SECRET = "cadence-internal-service-secret-key-12345";

    @Test
    @DisplayName("Valid HMAC properties validate successfully")
    void testValidHmacPropertiesPass() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("HS256");
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getJwt().setAudience("authenticated");
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        assertDoesNotThrow(props::validate);
    }

    @Test
    @DisplayName("Missing algorithm fails closed")
    void testMissingAlgorithmFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm(null);
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        assertThrows(SecurityConfigurationException.class, props::validate);
    }

    @Test
    @DisplayName("Unsupported algorithm fails closed")
    void testUnsupportedAlgorithmFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("NONE");
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        assertThrows(SecurityConfigurationException.class, props::validate);
    }

    @Test
    @DisplayName("Missing secret for HMAC fails closed")
    void testMissingSecretForHmacFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("HS256");
        props.getJwt().setSecret(null);
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        assertThrows(SecurityConfigurationException.class, props::validate);
    }

    @Test
    @DisplayName("Secret shorter than 256 bits (32 bytes) for HS256 fails closed")
    void testShortSecretForHmacFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("HS256");
        props.getJwt().setSecret("too-short-secret"); // only 16 bytes
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        SecurityConfigurationException ex = assertThrows(SecurityConfigurationException.class, props::validate);
        assertTrue(ex.getMessage().contains("must be at least 32 bytes"));
    }

    @Test
    @DisplayName("Conflicting configuration: HMAC secret alongside RSA public key fails closed")
    void testConflictingAsymmetricForHmacFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("HS256");
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setPublicKeyPem("-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----");
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        SecurityConfigurationException ex = assertThrows(SecurityConfigurationException.class, props::validate);
        assertTrue(ex.getMessage().contains("Conflicting JWT configuration"));
    }

    @Test
    @DisplayName("Conflicting configuration: HMAC secret configured when RSA is chosen fails closed")
    void testConflictingHmacSecretForRsaFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("RS256");
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setPublicKeyPem("some-pem");
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        SecurityConfigurationException ex = assertThrows(SecurityConfigurationException.class, props::validate);
        assertTrue(ex.getMessage().contains("Conflicting JWT configuration"));
    }

    @Test
    @DisplayName("Missing issuer fails closed")
    void testMissingIssuerFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("HS256");
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setIssuer(null);
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        assertThrows(SecurityConfigurationException.class, props::validate);
    }

    @Test
    @DisplayName("Missing audience fails closed")
    void testMissingAudienceFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("HS256");
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getJwt().setAudience("");
        props.getInternal().setSecret(VALID_INTERNAL_SECRET);

        assertThrows(SecurityConfigurationException.class, props::validate);
    }

    @Test
    @DisplayName("Missing internal secret when internal auth is enabled fails closed")
    void testMissingInternalSecretFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("HS256");
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getInternal().setEnabled(true);
        props.getInternal().setSecret(null);

        assertThrows(SecurityConfigurationException.class, props::validate);
    }

    @Test
    @DisplayName("Internal service secret shorter than 16 characters fails closed")
    void testShortInternalSecretFails() {
        CadenceSecurityProperties props = new CadenceSecurityProperties();
        props.getJwt().setAlgorithm("HS256");
        props.getJwt().setSecret(VALID_SECRET_32_BYTES);
        props.getJwt().setIssuer("https://supabase.cadence.internal/auth/v1");
        props.getInternal().setEnabled(true);
        props.getInternal().setSecret("too-short"); // < 16 chars

        SecurityConfigurationException ex = assertThrows(SecurityConfigurationException.class, props::validate);
        assertTrue(ex.getMessage().contains("at least 16 characters"));
    }
}
