package com.cadence.auth;

import com.cadence.auth.model.AppUser;
import com.cadence.auth.repository.AppUserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthSecurityIntegrationTest {

    private static final String TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String WRONG_SECRET = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
    private static final String TEST_INTERNAL_KEY = "internal-secret-for-tests-must-be-at-least-32-bytes-long";
    private static final String ISSUER = "https://auth.test.cadence.ai/auth/v1";
    private static final String AUDIENCE = "authenticated";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    private UUID existingUserId;
    private String existingUserEmail;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        existingUserId = UUID.randomUUID();
        existingUserEmail = "learner." + existingUserId + "@cadence.ai";
        userRepository.save(AppUser.builder()
                .id(existingUserId)
                .email(existingUserEmail)
                .build());
    }

    private String createJwt(UUID userId, String issuer, String audience, Instant expiry, String secret) {
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        var builder = Jwts.builder()
                .claim("role", "authenticated")
                .claim("email", "learner@cadence.ai")
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(expiry))
                .signWith(key, Jwts.SIG.HS256);

        if (userId != null) {
            builder.subject(userId.toString());
        }
        if (issuer != null) {
            builder.issuer(issuer);
        }
        if (audience != null) {
            builder.audience().add(audience);
        }
        return builder.compact();
    }

    private String createValidLearnerJwt(UUID userId) {
        return createJwt(userId, ISSUER, AUDIENCE, Instant.now().plusSeconds(3600), TEST_SECRET);
    }

    // ──────────────────────────────────────────────────────────────────
    // Actuator health
    // ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /actuator/health is publicly accessible (not blocked by security)")
    void healthEndpointIsPublic() throws Exception {
        // Health may return 503 if downstream services (RabbitMQ) are unreachable,
        // but it must NOT return 401/403 — that would mean security is blocking it.
        int status = mockMvc.perform(get("/actuator/health"))
                .andReturn().getResponse().getStatus();
        org.assertj.core.api.Assertions.assertThat(status)
                .as("Health endpoint must not be blocked by security")
                .isNotIn(401, 403);
    }

    // ──────────────────────────────────────────────────────────────────
    // /auth/me authentication and validation tests
    // ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /auth/me -> 401 when Authorization header is missing")
    void authMeMissingToken() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me -> 401 when token is malformed")
    void authMeMalformedToken() throws Exception {
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not.a.valid.jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me -> 401 when token is expired")
    void authMeExpiredToken() throws Exception {
        String token = createJwt(existingUserId, ISSUER, AUDIENCE, Instant.now().minusSeconds(60), TEST_SECRET);
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me -> 401 when token signature is wrong")
    void authMeWrongSignatureToken() throws Exception {
        String token = createJwt(existingUserId, ISSUER, AUDIENCE, Instant.now().plusSeconds(3600), WRONG_SECRET);
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me -> 401 when token issuer does not match")
    void authMeWrongIssuerToken() throws Exception {
        String token = createJwt(existingUserId, "https://wrong.issuer.com", AUDIENCE, Instant.now().plusSeconds(3600), TEST_SECRET);
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me -> 401 when token audience does not match")
    void authMeWrongAudienceToken() throws Exception {
        String token = createJwt(existingUserId, ISSUER, "wrong_audience", Instant.now().plusSeconds(3600), TEST_SECRET);
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me -> 401 when token uses unsupported algorithm (none)")
    void authMeUnsupportedAlgorithmToken() throws Exception {
        // Build an unsigned token with 'alg: none'
        String unsignedToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwMTIiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.";
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + unsignedToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me -> 200 with user details for valid learner token")
    void authMeValidLearnerToken() throws Exception {
        String token = createValidLearnerJwt(existingUserId);
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(existingUserId.toString()))
                .andExpect(jsonPath("$.email").value(existingUserEmail));
    }

    @Test
    @DisplayName("GET /auth/me -> 404 when learner token is valid but user does not exist in DB")
    void authMeNonExistentDatabaseUser() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        String token = createValidLearnerJwt(nonExistentId);
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    // ──────────────────────────────────────────────────────────────────
    // /auth/validate internal service authentication tests
    // ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /auth/validate -> 403 when internal key is missing but learner JWT present")
    void authValidateMissingInternalKey() throws Exception {
        // Learner JWT authenticates the request as ROLE_LEARNER,
        // but /auth/validate requires ROLE_INTERNAL_SERVICE -> 403 Forbidden
        String token = createValidLearnerJwt(existingUserId);
        mockMvc.perform(post("/auth/validate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /auth/validate -> 401 when internal key is incorrect")
    void authValidateIncorrectInternalKey() throws Exception {
        String token = createValidLearnerJwt(existingUserId);
        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", "invalid-internal-key-with-enough-bytes-12345")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /auth/validate -> 403 when called with learner token alone (no internal key)")
    void authValidateLearnerTokenAlone() throws Exception {
        // Same as authValidateMissingInternalKey: learner is authenticated but lacks ROLE_INTERNAL_SERVICE
        String token = createValidLearnerJwt(existingUserId);
        mockMvc.perform(post("/auth/validate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /auth/validate -> 200 when internal key is valid and target token is valid")
    void authValidateValidInternalKeyAndValidToken() throws Exception {
        String token = createValidLearnerJwt(existingUserId);
        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", TEST_INTERNAL_KEY)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.userId").value(existingUserId.toString()));
    }

    @Test
    @DisplayName("POST /auth/validate -> 401 when internal key is valid but target token is invalid")
    void authValidateValidInternalKeyAndInvalidToken() throws Exception {
        String expiredToken = createJwt(existingUserId, ISSUER, AUDIENCE, Instant.now().minusSeconds(60), TEST_SECRET);
        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", TEST_INTERNAL_KEY)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    // ──────────────────────────────────────────────────────────────────
    // Default deny for unknown routes
    // ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /unknown/route -> 401/403 default-deny for unknown route")
    void defaultDenyUnknownRoute() throws Exception {
        mockMvc.perform(get("/unknown/route"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /auth/unknown -> 401/403 default-deny for unknown auth route")
    void defaultDenyUnknownAuthRoute() throws Exception {
        mockMvc.perform(post("/auth/unknown"))
                .andExpect(status().isUnauthorized());
    }
}
