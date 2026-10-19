package com.cadence.security.jwt;

import com.cadence.security.exception.SecurityConfigurationException;

import java.util.Arrays;

/**
 * Explicitly supported JWT signing algorithms.
 * Algorithm fallback or 'none' is strictly rejected.
 */
public enum JwtAlgorithm {
    HS256("HS256", KeyFamily.HMAC, "HmacSHA256"),
    HS384("HS384", KeyFamily.HMAC, "HmacSHA384"),
    HS512("HS512", KeyFamily.HMAC, "HmacSHA512"),
    RS256("RS256", KeyFamily.RSA, "SHA256withRSA"),
    RS384("RS384", KeyFamily.RSA, "SHA384withRSA"),
    RS512("RS512", KeyFamily.RSA, "SHA512withRSA");

    public enum KeyFamily {
        HMAC,
        RSA
    }

    private final String standardName;
    private final KeyFamily keyFamily;
    private final String jcaName;

    JwtAlgorithm(String standardName, KeyFamily keyFamily, String jcaName) {
        this.standardName = standardName;
        this.keyFamily = keyFamily;
        this.jcaName = jcaName;
    }

    public String getStandardName() {
        return standardName;
    }

    public KeyFamily getKeyFamily() {
        return keyFamily;
    }

    public String getJcaName() {
        return jcaName;
    }

    public boolean isHmac() {
        return keyFamily == KeyFamily.HMAC;
    }

    public boolean isRsa() {
        return keyFamily == KeyFamily.RSA;
    }

    public static JwtAlgorithm fromString(String name) {
        if (name == null || name.isBlank()) {
            throw new SecurityConfigurationException("JWT algorithm must not be null or blank");
        }
        String clean = name.trim().toUpperCase();
        for (JwtAlgorithm alg : values()) {
            if (alg.standardName.equalsIgnoreCase(clean)) {
                return alg;
            }
        }
        throw new SecurityConfigurationException(
                "Unsupported JWT algorithm: '" + name + "'. Supported algorithms: " + Arrays.toString(values())
        );
    }
}
