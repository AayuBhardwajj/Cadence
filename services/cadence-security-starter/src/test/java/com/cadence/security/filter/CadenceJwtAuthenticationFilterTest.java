package com.cadence.security.filter;

import com.cadence.security.auth.CadenceLearnerAuthenticationToken;
import com.cadence.security.exception.InvalidTokenException;
import com.cadence.security.exception.InvalidTokenException.Reason;
import com.cadence.security.jwt.JwtClaims;
import com.cadence.security.jwt.JwtValidator;
import com.cadence.security.model.LearnerPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CadenceJwtAuthenticationFilterTest {

    private JwtValidator mockValidator;
    private CadenceJwtAuthenticationFilter filter;
    private FilterChain mockFilterChain;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        mockValidator = Mockito.mock(JwtValidator.class);
        mockFilterChain = Mockito.mock(FilterChain.class);
        filter = new CadenceJwtAuthenticationFilter(mockValidator);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Request without Authorization header passes down chain without setting authentication")
    void testNoAuthHeaderPassesThrough() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, times(1)).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(200, response.getStatus());
    }

    @Test
    @DisplayName("Request with non-Bearer authorization header is rejected with 401")
    void testNonBearerHeaderRejected() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, never()).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid authorization scheme"));
    }

    @Test
    @DisplayName("Request with empty Bearer token is rejected with 401")
    void testEmptyBearerTokenRejected() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer    ");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, never()).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Empty bearer token"));
    }

    @Test
    @DisplayName("Request with valid Bearer token sets LearnerPrincipal and ROLE_LEARNER")
    void testValidBearerTokenAuthenticatesLearner() throws ServletException, IOException {
        UUID learnerId = UUID.randomUUID();
        JwtClaims verifiedClaims = new JwtClaims(
                learnerId,
                learnerId.toString(),
                "learner@cadence.ai",
                "authenticated",
                "https://test.supabase.co/auth/v1",
                Set.of("authenticated"),
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of()
        );
        when(mockValidator.validate("valid.jwt.token")).thenReturn(verifiedClaims);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer valid.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, times(1)).doFilter(request, response);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertInstanceOf(CadenceLearnerAuthenticationToken.class, auth);

        LearnerPrincipal principal = (LearnerPrincipal) auth.getPrincipal();
        assertEquals(learnerId, principal.userId());
        assertEquals("learner@cadence.ai", principal.email());

        // Assert role is ROLE_LEARNER and ROLE_AUTHENTICATED, but NEVER ROLE_INTERNAL_SERVICE
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_LEARNER")));
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_AUTHENTICATED")));
        assertFalse(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_INTERNAL_SERVICE")));
    }

    @Test
    @DisplayName("Request with invalid or expired Bearer token halts chain and returns 401")
    void testInvalidBearerTokenRejected() throws ServletException, IOException {
        when(mockValidator.validate(anyString())).thenThrow(new InvalidTokenException(Reason.EXPIRED, "Token expired"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer expired.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, never()).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid or expired token"));
    }
}
