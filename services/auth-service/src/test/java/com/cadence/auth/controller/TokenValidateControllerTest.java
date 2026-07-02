package com.cadence.auth.controller;

import com.cadence.auth.exception.InvalidTokenException;
import com.cadence.auth.service.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Slice test for {@link TokenValidateController}.
 *
 * Uses @WebMvcTest to load only the web layer and mocks JwtService
 * so the test is fully isolated from JWT crypto and the database.
 */
@WebMvcTest(controllers = TokenValidateController.class)
@Import(com.cadence.auth.config.SecurityConfig.class)
class TokenValidateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    private static final String VALID_TOKEN   = "valid.jwt.token";
    private static final String INVALID_TOKEN = "bad.jwt.token";
    private static final String USER_ID       = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    private static final String EMAIL         = "user@cadence.app";

    @Test
    @DisplayName("POST /auth/validate → 200 with userId and email for a valid token")
    void shouldReturn200ForValidToken() throws Exception {
        when(jwtService.validateAndExtractUserId(VALID_TOKEN)).thenReturn(USER_ID);
        when(jwtService.validateAndExtractEmail(VALID_TOKEN)).thenReturn(Optional.of(EMAIL));

        mockMvc.perform(post("/auth/validate")
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.userId").value(USER_ID))
                .andExpect(jsonPath("$.email").value(EMAIL));
    }

    @Test
    @DisplayName("POST /auth/validate → 200 with null email when claim absent")
    void shouldReturn200WithNullEmailWhenEmailAbsent() throws Exception {
        when(jwtService.validateAndExtractUserId(VALID_TOKEN)).thenReturn(USER_ID);
        when(jwtService.validateAndExtractEmail(VALID_TOKEN)).thenReturn(Optional.empty());

        mockMvc.perform(post("/auth/validate")
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.userId").value(USER_ID));
    }

    @Test
    @DisplayName("POST /auth/validate → 401 for an invalid token")
    void shouldReturn401ForInvalidToken() throws Exception {
        when(jwtService.validateAndExtractUserId(INVALID_TOKEN))
                .thenThrow(new InvalidTokenException("JWT token has expired"));

        mockMvc.perform(post("/auth/validate")
                        .header("Authorization", "Bearer " + INVALID_TOKEN))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.error").value("JWT token has expired"));
    }

    @Test
    @DisplayName("POST /auth/validate → 401 when Authorization header is missing")
    void shouldReturn401WhenAuthHeaderMissing() throws Exception {
        mockMvc.perform(post("/auth/validate"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.valid").value(false));
    }

    @Test
    @DisplayName("POST /auth/validate → 401 when Authorization header lacks Bearer prefix")
    void shouldReturn401WhenBearerPrefixMissing() throws Exception {
        mockMvc.perform(post("/auth/validate")
                        .header("Authorization", VALID_TOKEN))  // No "Bearer " prefix
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.valid").value(false));
    }
}
