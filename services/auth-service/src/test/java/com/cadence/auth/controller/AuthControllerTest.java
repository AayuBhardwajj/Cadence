package com.cadence.auth.controller;

import com.cadence.auth.model.AppUser;
import com.cadence.auth.repository.AppUserRepository;
import com.cadence.auth.service.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Slice test for {@link AuthController}.
 *
 * Spring Security is active here (imported explicitly), so requests
 * that lack a valid principal will receive 401.
 *
 * JwtAuthFilter sets the principal as a plain String (the userId).
 * We replicate that here by constructing a UsernamePasswordAuthenticationToken
 * whose principal is the userId String and injecting it via
 * SecurityMockMvcRequestPostProcessors.authentication().
 */
@WebMvcTest(controllers = AuthController.class)
@Import(com.cadence.auth.config.SecurityConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;          // needed by SecurityConfig

    @MockBean
    private AppUserRepository userRepository;

    private static final UUID   USER_UUID = UUID.fromString("f47ac10b-58cc-4372-a567-0e02b2c3d479");
    private static final String USER_ID   = USER_UUID.toString();
    private static final String EMAIL     = "user@cadence.app";

    /** Helper to build the same Authentication object that JwtAuthFilter produces. */
    private static Authentication jwtAuth(String userId) {
        return new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
    }

    @Test
    @DisplayName("GET /auth/me → 200 with userId and email for authenticated user")
    void shouldReturnUserInfoForAuthenticatedRequest() throws Exception {
        AppUser user = AppUser.builder()
                .id(USER_UUID)
                .email(EMAIL)
                .build();
        when(userRepository.findById(USER_UUID)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/auth/me")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(jwtAuth(USER_ID))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(USER_ID))
                .andExpect(jsonPath("$.email").value(EMAIL));
    }

    @Test
    @DisplayName("GET /auth/me → 401 when no authentication is present")
    void shouldReturn401WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me → 404 when user row is not found in the database")
    void shouldReturn404WhenUserNotFound() throws Exception {
        when(userRepository.findById(USER_UUID)).thenReturn(Optional.empty());

        mockMvc.perform(get("/auth/me")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(jwtAuth(USER_ID))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"));
    }
}
