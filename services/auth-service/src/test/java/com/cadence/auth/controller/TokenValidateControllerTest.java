package com.cadence.auth.controller;

import com.cadence.auth.config.SecurityConfig;
import com.cadence.security.config.CadenceSecurityAutoConfiguration;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice test for {@link TokenValidateController}.
 *
 * Uses @WebMvcTest with CadenceSecurityAutoConfiguration and SecurityConfig.
 * Tests internal service authorization and token validation.
 */
@WebMvcTest(controllers = TokenValidateController.class)
@Import({SecurityConfig.class, CadenceSecurityAutoConfiguration.class})
@ActiveProfiles("test")
class TokenValidateControllerTest {

    private static final String TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String TEST_INTERNAL_KEY = "internal-secret-for-tests-must-be-at-least-32-bytes-long";

    @Autowired
    private MockMvc mockMvc;

    private static final String USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    private static final String EMAIL = "user@cadence.app";

    private String buildToken(String subject, String email, Instant expiry) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        var builder = Jwts.builder()
                .subject(subject)
                .claim("role", "authenticated")
                .issuer("https://auth.test.cadence.ai/auth/v1")
                .audience().add("authenticated").and()
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(expiry))
                .signWith(key, Jwts.SIG.HS256);
        if (email != null) {
            builder.claim("email", email);
        }
        return builder.compact();
    }

    @Test
    @DisplayName("POST /auth/validate -> 403 when internal service key is missing but learner JWT is present")
    void shouldReturn403WhenInternalKeyMissingButLearnerAuthenticated() throws Exception {
        String token = buildToken(USER_ID, EMAIL, Instant.now().plusSeconds(3600));

        // Learner JWT authenticates the request as ROLE_LEARNER,
        // but /auth/validate requires ROLE_INTERNAL_SERVICE -> 403
        mockMvc.perform(post("/auth/validate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /auth/validate -> 401 when internal service key is incorrect")
    void shouldReturn401WhenInternalKeyIncorrect() throws Exception {
        String token = buildToken(USER_ID, EMAIL, Instant.now().plusSeconds(3600));

        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", "wrong-internal-service-key-1234567890")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /auth/validate -> 200 with userId and email for valid token with internal key")
    void shouldReturn200ForValidTokenWithInternalKey() throws Exception {
        String token = buildToken(USER_ID, EMAIL, Instant.now().plusSeconds(3600));

        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", TEST_INTERNAL_KEY)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.userId").value(USER_ID))
                .andExpect(jsonPath("$.email").value(EMAIL));
    }

    @Test
    @DisplayName("POST /auth/validate -> 200 with null email when email claim is absent")
    void shouldReturn200WithNullEmailWhenEmailAbsent() throws Exception {
        String token = buildToken(USER_ID, null, Instant.now().plusSeconds(3600));

        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", TEST_INTERNAL_KEY)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.userId").value(USER_ID));
    }

    @Test
    @DisplayName("POST /auth/validate -> 401 for an expired token")
    void shouldReturn401ForExpiredToken() throws Exception {
        String expiredToken = buildToken(USER_ID, EMAIL, Instant.now().minusSeconds(3600));

        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", TEST_INTERNAL_KEY)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("POST /auth/validate -> 401 when Authorization header is missing")
    void shouldReturn401WhenAuthHeaderMissing() throws Exception {
        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", TEST_INTERNAL_KEY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.error").value("Missing or malformed Authorization header"));
    }

    @Test
    @DisplayName("POST /auth/validate -> 401 when Authorization header lacks Bearer prefix")
    void shouldReturn401WhenBearerPrefixMissing() throws Exception {
        mockMvc.perform(post("/auth/validate")
                        .header("X-Internal-Service-Key", TEST_INTERNAL_KEY)
                        .header(HttpHeaders.AUTHORIZATION, "not-a-bearer-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.error").value("Missing or malformed Authorization header"));
    }
}
