package com.cadence.security.filter;

import com.cadence.security.auth.CadenceLearnerAuthenticationToken;
import com.cadence.security.exception.InvalidTokenException;
import com.cadence.security.jwt.JwtClaims;
import com.cadence.security.jwt.JwtValidator;
import com.cadence.security.model.LearnerPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Validates incoming Bearer JWT tokens for learner routes.
 * Fails closed on any malformed, invalid, or expired tokens without logging token content.
 */
public class CadenceJwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(CadenceJwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtValidator jwtValidator;

    public CadenceJwtAuthenticationFilter(JwtValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        // If no Authorization header is present, continue along the chain.
        // Spring Security will enforce whether the target endpoint permits anonymous access.
        if (authHeader == null || authHeader.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!authHeader.startsWith(BEARER_PREFIX)) {
            log.debug("Rejected non-Bearer authorization header");
            sendUnauthorized(response, "Invalid authorization scheme");
            return;
        }

        String token = authHeader.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            log.debug("Rejected empty Bearer token");
            sendUnauthorized(response, "Empty bearer token");
            return;
        }

        try {
            JwtClaims claims = jwtValidator.validate(token);
            LearnerPrincipal principal = new LearnerPrincipal(claims.userId(), claims.email(), claims.role());
            CadenceLearnerAuthenticationToken authentication = new CadenceLearnerAuthenticationToken(principal);

            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);

        } catch (InvalidTokenException e) {
            log.debug("JWT authentication failed: reason={}", e.getReason());
            sendUnauthorized(response, "Invalid or expired token");
        } catch (Exception e) {
            log.error("Unexpected error during JWT authentication");
            sendUnauthorized(response, "Authentication failed");
        }
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(String.format("{\"error\":\"unauthorized\",\"message\":\"%s\"}", message));
        response.getWriter().flush();
    }
}
