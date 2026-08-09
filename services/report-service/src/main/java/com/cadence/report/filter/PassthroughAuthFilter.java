package com.cadence.report.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Passthrough security filter for report-service.
 * Accepts requests unauthenticated during initial scaffolding phase.
 * Real JWT validation logic is deferred per DEVELOPMENT_RULES.md section 3.3.
 */
public class PassthroughAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // Passthrough — requests pass through without JWT validation at this phase
        filterChain.doFilter(request, response);
    }
}
