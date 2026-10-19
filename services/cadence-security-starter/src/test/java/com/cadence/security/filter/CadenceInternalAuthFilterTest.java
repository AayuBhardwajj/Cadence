package com.cadence.security.filter;

import com.cadence.security.auth.CadenceInternalAuthenticationToken;
import com.cadence.security.model.InternalServicePrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CadenceInternalAuthFilterTest {

    private static final String HEADER_NAME = "X-Internal-Service-Key";
    private static final String VALID_SECRET = "super-secret-internal-cadence-key-12345";

    private CadenceInternalAuthFilter filter;
    private FilterChain mockFilterChain;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        mockFilterChain = Mockito.mock(FilterChain.class);
        filter = new CadenceInternalAuthFilter(true, HEADER_NAME, VALID_SECRET);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Request without internal service header passes down chain without setting authentication")
    void testNoHeaderPassesThrough() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, times(1)).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(200, response.getStatus());
    }

    @Test
    @DisplayName("Request with valid internal service key sets InternalServicePrincipal and ROLE_INTERNAL_SERVICE")
    void testValidInternalKeyAuthenticates() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HEADER_NAME, VALID_SECRET);
        request.addHeader("X-Service-Name", "ml-recommendation");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, times(1)).doFilter(request, response);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertInstanceOf(CadenceInternalAuthenticationToken.class, auth);

        InternalServicePrincipal principal = (InternalServicePrincipal) auth.getPrincipal();
        assertEquals("ml-recommendation", principal.serviceName());

        // Confirms ROLE_INTERNAL_SERVICE is granted, but NEVER ROLE_LEARNER
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_INTERNAL_SERVICE")));
        assertFalse(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_LEARNER")));
    }

    @Test
    @DisplayName("Request with invalid internal service key halts chain and returns 401")
    void testInvalidInternalKeyRejected() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HEADER_NAME, "wrong-key-value-12345");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, never()).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid internal service key"));
    }

    @Test
    @DisplayName("When internal auth is disabled, requests with or without key pass down chain")
    void testDisabledInternalAuthPassesThrough() throws ServletException, IOException {
        CadenceInternalAuthFilter disabledFilter = new CadenceInternalAuthFilter(false, HEADER_NAME, VALID_SECRET);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HEADER_NAME, "arbitrary-key");
        MockHttpServletResponse response = new MockHttpServletResponse();

        disabledFilter.doFilter(request, response, mockFilterChain);

        verify(mockFilterChain, times(1)).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
