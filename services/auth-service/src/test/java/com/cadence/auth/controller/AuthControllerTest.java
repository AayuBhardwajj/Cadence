package com.cadence.auth.controller;

import com.cadence.auth.config.SecurityConfig;
import com.cadence.auth.model.AppUser;
import com.cadence.auth.repository.AppUserRepository;
import com.cadence.security.config.CadenceSecurityAutoConfiguration;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice test for {@link AuthController}.
 *
 * Spring Security and CadenceSecurityAutoConfiguration are active.
 * Tests verify authentication, @CurrentLearnerId resolution, and user lookup.
 */
@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, CadenceSecurityAutoConfiguration.class})
@ActiveProfiles("test")
class AuthControllerTest {

    private static final String TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AppUserRepository userRepository;

    private static final UUID USER_UUID = UUID.fromString("f47ac10b-58cc-4372-a567-0e02b2c3d479");
    private static final String USER_ID = USER_UUID.toString();
    private static final String EMAIL = "user@cadence.app";

    private String generateLearnerJwt(UUID userId) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", EMAIL)
                .claim("role", "authenticated")
                .issuer("https://auth.test.cadence.ai/auth/v1")
                .audience().add("authenticated").and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    @Test
    @DisplayName("GET /auth/me -> 200 with userId and email for authenticated learner")
    void shouldReturnUserInfoForAuthenticatedRequest() throws Exception {
        AppUser user = AppUser.builder()
                .id(USER_UUID)
                .email(EMAIL)
                .build();
        when(userRepository.findById(USER_UUID)).thenReturn(Optional.of(user));

        String token = generateLearnerJwt(USER_UUID);

        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(USER_ID))
                .andExpect(jsonPath("$.email").value(EMAIL));
    }

    @Test
    @DisplayName("GET /auth/me -> 401 when no authentication is present")
    void shouldReturn401WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me -> 404 when user row is not found in database")
    void shouldReturn404WhenUserNotFound() throws Exception {
        when(userRepository.findById(USER_UUID)).thenReturn(Optional.empty());

        String token = generateLearnerJwt(USER_UUID);

        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"));
    }
}
