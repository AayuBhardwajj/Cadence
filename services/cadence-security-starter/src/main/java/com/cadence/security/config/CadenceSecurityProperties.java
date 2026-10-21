package com.cadence.security.config;

import com.cadence.security.exception.SecurityConfigurationException;
import com.cadence.security.jwt.JwtAlgorithm;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Configuration properties for Cadence security.
 * Enforces explicit algorithm, key source, and claim constraints.
 * Fails closed on missing or conflicting configuration.
 */
@ConfigurationProperties(prefix = "cadence.security")
public class CadenceSecurityProperties {

    private JwtProperties jwt = new JwtProperties();
    private InternalServiceProperties internal = new InternalServiceProperties();
    private String environment = "prod";

    public JwtProperties getJwt() {
        return jwt;
    }

    public void setJwt(JwtProperties jwt) {
        this.jwt = jwt;
    }

    public InternalServiceProperties getInternal() {
        return internal;
    }

    public void setInternal(InternalServiceProperties internal) {
        this.internal = internal;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    /**
     * Validates configuration and fails closed on any invalid, missing, or contradictory settings.
     */
    public void validate() {
        if (jwt == null) {
            throw new SecurityConfigurationException("cadence.security.jwt configuration is required");
        }
        jwt.validate();

        if (internal == null) {
            throw new SecurityConfigurationException("cadence.security.internal configuration is required");
        }
        internal.validate();
    }

    public static class JwtProperties {
        private List<String> allowedAlgorithms = new java.util.ArrayList<>(java.util.List.of("HS256"));
        private String secret;
        private String secondarySecret;
        private String publicKeyPem;
        private String secondaryPublicKeyPem;
        private String jwksUrl;
        private long jwksCacheTtlSeconds = 600;
        private long jwksMinRefreshSeconds = 30;
        private String issuer;
        private String audience = "authenticated";
        private long clockSkewSeconds = 30;
        private boolean requireSubject = true;

        public String getAlgorithm() {
            return allowedAlgorithms != null && !allowedAlgorithms.isEmpty() ? allowedAlgorithms.get(0) : "HS256";
        }

        public void setAlgorithm(String algorithm) {
            if (algorithm != null && !algorithm.isBlank()) {
                this.allowedAlgorithms = new java.util.ArrayList<>(java.util.List.of(algorithm.trim()));
            } else {
                this.allowedAlgorithms = new java.util.ArrayList<>();
            }
        }

        public java.util.List<String> getAllowedAlgorithms() {
            return allowedAlgorithms;
        }

        public void setAllowedAlgorithms(java.util.List<String> allowedAlgorithms) {
            if (allowedAlgorithms != null) {
                java.util.List<String> flatList = new java.util.ArrayList<>();
                for (String item : allowedAlgorithms) {
                    if (item != null) {
                        for (String part : item.split(",")) {
                            if (!part.isBlank()) {
                                flatList.add(part.trim());
                            }
                        }
                    }
                }
                this.allowedAlgorithms = flatList;
            } else {
                this.allowedAlgorithms = new java.util.ArrayList<>(java.util.List.of("HS256"));
            }
        }

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public String getSecondarySecret() {
            return secondarySecret;
        }

        public void setSecondarySecret(String secondarySecret) {
            this.secondarySecret = secondarySecret;
        }

        public String getPublicKeyPem() {
            return publicKeyPem;
        }

        public void setPublicKeyPem(String publicKeyPem) {
            this.publicKeyPem = publicKeyPem;
        }

        public String getSecondaryPublicKeyPem() {
            return secondaryPublicKeyPem;
        }

        public void setSecondaryPublicKeyPem(String secondaryPublicKeyPem) {
            this.secondaryPublicKeyPem = secondaryPublicKeyPem;
        }

        public String getJwksUrl() {
            return jwksUrl;
        }

        public void setJwksUrl(String jwksUrl) {
            this.jwksUrl = jwksUrl;
        }

        public long getJwksCacheTtlSeconds() {
            return jwksCacheTtlSeconds;
        }

        public void setJwksCacheTtlSeconds(long jwksCacheTtlSeconds) {
            this.jwksCacheTtlSeconds = jwksCacheTtlSeconds;
        }

        public long getJwksMinRefreshSeconds() {
            return jwksMinRefreshSeconds;
        }

        public void setJwksMinRefreshSeconds(long jwksMinRefreshSeconds) {
            this.jwksMinRefreshSeconds = jwksMinRefreshSeconds;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }

        public String getAudience() {
            return audience;
        }

        public void setAudience(String audience) {
            this.audience = audience;
        }

        public long getClockSkewSeconds() {
            return clockSkewSeconds;
        }

        public void setClockSkewSeconds(long clockSkewSeconds) {
            this.clockSkewSeconds = clockSkewSeconds;
        }

        public boolean isRequireSubject() {
            return requireSubject;
        }

        public void setRequireSubject(boolean requireSubject) {
            this.requireSubject = requireSubject;
        }

        public void validate() {
            if (allowedAlgorithms == null || allowedAlgorithms.isEmpty()) {
                throw new SecurityConfigurationException("JWT allowed algorithms (cadence.security.jwt.allowed-algorithms) must be explicitly specified (e.g. HS256, ES256)");
            }

            java.util.List<JwtAlgorithm> parsedAlgorithms = new java.util.ArrayList<>();
            for (String algStr : allowedAlgorithms) {
                if (algStr == null || algStr.isBlank()) {
                    throw new SecurityConfigurationException("JWT algorithm in allowedAlgorithms must not be null or blank");
                }
                parsedAlgorithms.add(JwtAlgorithm.fromString(algStr));
            }

            if (issuer == null || issuer.isBlank()) {
                throw new SecurityConfigurationException("JWT expected issuer (cadence.security.jwt.issuer) must be explicitly specified");
            }

            if (audience == null || audience.isBlank()) {
                throw new SecurityConfigurationException("JWT expected audience (cadence.security.jwt.audience) must be explicitly specified");
            }

            if (clockSkewSeconds < 0 || clockSkewSeconds > 300) {
                throw new SecurityConfigurationException("JWT clock skew must be between 0 and 300 seconds");
            }

            if (jwksCacheTtlSeconds < 0) {
                throw new SecurityConfigurationException("JWT jwks-cache-ttl-seconds must be non-negative");
            }

            if (jwksMinRefreshSeconds < 0) {
                throw new SecurityConfigurationException("JWT jwks-min-refresh-seconds must be non-negative");
            }

            boolean hasHmac = parsedAlgorithms.stream().anyMatch(JwtAlgorithm::isHmac);
            if (hasHmac) {
                if (!hasText(secret)) {
                    throw new SecurityConfigurationException(
                            "JWT secret (cadence.security.jwt.secret) must not be blank when HMAC algorithms are allowed"
                    );
                }

                byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
                int minBytes = 32;
                for (JwtAlgorithm alg : parsedAlgorithms) {
                    if (alg.isHmac()) {
                        int algMin = switch (alg) {
                            case HS384 -> 48;
                            case HS512 -> 64;
                            default -> 32;
                        };
                        minBytes = Math.max(minBytes, algMin);
                    }
                }

                if (keyBytes.length < minBytes) {
                    throw new SecurityConfigurationException(
                            "JWT secret for HMAC must be at least " + minBytes + " bytes (" + (minBytes * 8) + " bits), but was " + keyBytes.length + " bytes"
                    );
                }

                if (hasText(secondarySecret)) {
                    byte[] secBytes = secondarySecret.getBytes(StandardCharsets.UTF_8);
                    if (secBytes.length < minBytes) {
                        throw new SecurityConfigurationException(
                                "JWT secondary secret for HMAC must be at least " + minBytes + " bytes"
                        );
                    }
                }
            }

            boolean hasAsymmetric = parsedAlgorithms.stream().anyMatch(JwtAlgorithm::isAsymmetric);
            if (hasAsymmetric) {
                if (!hasText(publicKeyPem) && !hasText(jwksUrl)) {
                    throw new SecurityConfigurationException(
                            "Either publicKeyPem or jwksUrl must be provided when asymmetric algorithms are allowed"
                    );
                }
            }
        }

        private boolean hasText(String str) {
            return str != null && !str.isBlank();
        }
    }

    public static class InternalServiceProperties {
        private boolean enabled = true;
        private String secret;
        private String headerName = "X-Internal-Service-Key";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public String getHeaderName() {
            return headerName;
        }

        public void setHeaderName(String headerName) {
            this.headerName = headerName;
        }

        public void validate() {
            if (enabled) {
                if (secret == null || secret.isBlank()) {
                    throw new SecurityConfigurationException(
                            "Internal service secret (cadence.security.internal.secret) must not be blank when internal auth is enabled"
                    );
                }
                if (secret.length() < 16) {
                    throw new SecurityConfigurationException(
                            "Internal service secret must be at least 16 characters long"
                    );
                }
                if (headerName == null || headerName.isBlank()) {
                    throw new SecurityConfigurationException(
                            "Internal service headerName must not be blank"
                    );
                }
            }
        }
    }
}
