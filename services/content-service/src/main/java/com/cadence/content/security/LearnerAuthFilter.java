package com.cadence.content.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Slf4j
public class LearnerAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

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
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                log.debug("Rejected malformed JWT structure");
                sendUnauthorized(response, "Malformed token structure");
                return;
            }

            // 1. Verify header
            byte[] headerBytes = Base64.getUrlDecoder().decode(parts[0]);
            JsonNode headerNode = objectMapper.readTree(headerBytes);
            if (headerNode == null || !headerNode.has("alg")) {
                sendUnauthorized(response, "Token missing required 'alg' header");
                return;
            }
            String alg = headerNode.get("alg").asText().trim();
            if ("none".equalsIgnoreCase(alg)) {
                sendUnauthorized(response, "Algorithm 'none' is forbidden");
                return;
            }

            // 2. Verify payload claims
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode payloadNode = objectMapper.readTree(payloadBytes);
            if (payloadNode == null) {
                sendUnauthorized(response, "Invalid token payload");
                return;
            }

            // Expiration check
            if (payloadNode.has("exp")) {
                long exp = payloadNode.get("exp").asLong();
                if (exp > 0 && exp < Instant.now().getEpochSecond()) {
                    sendUnauthorized(response, "Token has expired");
                    return;
                }
            }

            // Subject check
            if (!payloadNode.has("sub") || payloadNode.get("sub").asText().isBlank()) {
                sendUnauthorized(response, "Token missing required subject claim");
                return;
            }

            UUID userId;
            try {
                userId = UUID.fromString(payloadNode.get("sub").asText().trim());
            } catch (IllegalArgumentException e) {
                sendUnauthorized(response, "Subject is not a valid UUID");
                return;
            }

            String email = payloadNode.has("email") ? payloadNode.get("email").asText() : "";
            String role = payloadNode.has("role") ? payloadNode.get("role").asText() : "authenticated";

            LearnerPrincipal principal = new LearnerPrincipal(userId, email, role);
            CadenceLearnerAuthenticationToken authentication = new CadenceLearnerAuthenticationToken(principal);

            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);

        } catch (Exception e) {
            log.debug("Token parsing failed: {}", e.getMessage());
            sendUnauthorized(response, "Invalid or unparseable token");
        }
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(String.format("{\"error\": \"Unauthorized\", \"message\": \"%s\"}", message));
        response.getWriter().flush();
    }
}
