package com.cadence.security.jwt;

import com.cadence.security.exception.InvalidTokenException;
import com.cadence.security.exception.InvalidTokenException.Reason;
import io.jsonwebtoken.security.Jwk;
import io.jsonwebtoken.security.JwkSet;
import io.jsonwebtoken.security.Jwks;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Resolves asymmetric public verification keys from a JWKS endpoint (RFC 7517).
 * Caches keys for TTL, throttles unknown kid refetches, keeps serving stale cache
 * on refresh failures, and fails closed if keys were never fetched.
 */
public class JwksKeyResolver {

    private static final Logger log = LoggerFactory.getLogger(JwksKeyResolver.class);

    @FunctionalInterface
    public interface JwksFetcher {
        String fetchJwks(String jwksUrl) throws Exception;
    }

    private final String jwksUrl;
    private final long cacheTtlSeconds;
    private final long minRefreshSeconds;
    private final JwksFetcher jwksFetcher;

    private final Map<String, Key> keyCache = new ConcurrentHashMap<>();
    private volatile Instant lastFetchedAt = null;
    private final Object fetchLock = new Object();

    public JwksKeyResolver(String jwksUrl, long cacheTtlSeconds, long minRefreshSeconds) {
        this(jwksUrl, cacheTtlSeconds, minRefreshSeconds, createDefaultFetcher());
    }

    public JwksKeyResolver(String jwksUrl, long cacheTtlSeconds, long minRefreshSeconds, JwksFetcher jwksFetcher) {
        this.jwksUrl = jwksUrl;
        this.cacheTtlSeconds = cacheTtlSeconds;
        this.minRefreshSeconds = minRefreshSeconds;
        this.jwksFetcher = jwksFetcher;
    }

    private static JwksFetcher createDefaultFetcher() {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();

        return url -> {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IOException("Failed to fetch JWKS from " + url + ", HTTP status: " + response.statusCode());
            }
            return response.body();
        };
    }

    /**
     * Resolves an asymmetric key from the cache or by fetching from JWKS.
     * Fails closed if keys were never fetched or if kid remains unknown.
     */
    public Key locateKey(String kid) {
        if (kid == null || kid.isBlank()) {
            throw new InvalidTokenException(Reason.UNSUPPORTED_ALGORITHM, "Asymmetric token missing required 'kid' header");
        }

        // Case 1: Keys were never fetched
        if (lastFetchedAt == null) {
            synchronized (fetchLock) {
                if (lastFetchedAt == null) {
                    try {
                        refreshCache();
                    } catch (Exception e) {
                        log.warn("Failed to fetch JWKS keys on initial load: {}", e.getMessage());
                        throw new InvalidTokenException(Reason.BAD_SIGNATURE, "JWKS keys could not be fetched and cache is empty", e);
                    }
                }
            }
        }

        Key cachedKey = keyCache.get(kid);
        Instant now = Instant.now();

        if (cachedKey != null) {
            // Check if cache TTL has expired
            if (now.isAfter(lastFetchedAt.plusSeconds(cacheTtlSeconds))) {
                synchronized (fetchLock) {
                    if (Instant.now().isAfter(lastFetchedAt.plusSeconds(cacheTtlSeconds))) {
                        try {
                            refreshCache();
                        } catch (Exception e) {
                            log.warn("Failed to refresh expired JWKS cache, continuing with stale cache: {}", e.getMessage());
                        }
                    }
                }
                // Return cached key (even if refresh failed, we serve stale cache)
                return keyCache.getOrDefault(kid, cachedKey);
            }
            return cachedKey;
        }

        // Case 2: Unknown kid - attempt refetch throttled by minRefreshSeconds
        synchronized (fetchLock) {
            Instant curNow = Instant.now();
            if (curNow.isAfter(lastFetchedAt.plusSeconds(minRefreshSeconds))) {
                try {
                    refreshCache();
                } catch (Exception e) {
                    log.warn("Failed to refresh JWKS cache for unknown kid '{}', continuing with existing cache: {}", kid, e.getMessage());
                }
            } else {
                log.debug("Skipping JWKS refresh for unknown kid '{}': throttled by minRefreshSeconds ({}s)", kid, minRefreshSeconds);
            }
        }

        Key resolved = keyCache.get(kid);
        if (resolved == null) {
            log.warn("Rejected JWT: unknown key ID '{}' not found in JWKS", kid);
            throw new InvalidTokenException(Reason.BAD_SIGNATURE, "Unknown key ID: " + kid);
        }
        return resolved;
    }

    private void refreshCache() throws Exception {
        String json = jwksFetcher.fetchJwks(jwksUrl);
        JwkSet jwkSet = Jwks.setParser().build().parse(json);
        Map<String, Key> newKeys = new HashMap<>();
        for (Jwk<?> jwk : jwkSet.getKeys()) {
            String id = jwk.getId();
            if (id != null && !id.isBlank()) {
                try {
                    Key k = jwk.toKey();
                    newKeys.put(id, k);
                } catch (Exception e) {
                    log.warn("Skipping unparseable JWK with id '{}': {}", id, e.getMessage());
                }
            }
        }
        if (!newKeys.isEmpty()) {
            keyCache.putAll(newKeys);
        }
        lastFetchedAt = Instant.now();
        log.info("Successfully fetched and cached {} JWK keys from {}", newKeys.size(), jwksUrl);
    }

    public Instant getLastFetchedAt() {
        return lastFetchedAt;
    }

    public int getCachedKeyCount() {
        return keyCache.size();
    }
}
