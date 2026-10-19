package com.cadence.security.filter;

import com.cadence.security.auth.CadenceInternalAuthenticationToken;
import com.cadence.security.config.CadenceSecurityProperties;
import com.cadence.security.model.InternalServicePrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Validates internal service-to-service calls using a shared secret header with constant-time comparison.
 * Explicitly separates internal-service authorization from learner authentication.
 */
public class CadenceInternalAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(CadenceInternalAuthFilter.class);
    private static final String SERVICE_NAME_HEADER = "X-Service-Name";

    private final boolean enabled;
    private final String headerName;
    private final byte[] expectedSecretBytes;

    public CadenceInternalAuthFilter(CadenceSecurityProperties properties) {
        CadenceSecurityProperties.InternalServiceProperties internalProps = properties.getInternal();
        this.enabled = internalProps.isEnabled();
        this.headerName = internalProps.getHeaderName();
        this.expectedSecretBytes = internalProps.getSecret() != null
                ? internalProps.getSecret().getBytes(StandardCharsets.UTF_8)
                : new byte[0];
    }

    /**
     * Package-private constructor for isolated unit tests.
     */
    CadenceInternalAuthFilter(boolean enabled, String headerName, String secret) {
        this.enabled = enabled;
        this.headerName = headerName;
        this.expectedSecretBytes = secret != null ? secret.getBytes(StandardCharsets.UTF_8) : new byte[0];
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String providedKey = request.getHeader(headerName);

        // If internal service header is absent, proceed down chain.
        // Endpoints configured with hasRole('INTERNAL_SERVICE') will fail if not authenticated.
        if (providedKey == null || providedKey.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        byte[] providedBytes = providedKey.getBytes(StandardCharsets.UTF_8);

        // Constant-time comparison to prevent timing attacks
        boolean isValid = MessageDigest.isEqual(providedBytes, expectedSecretBytes);

        if (!isValid) {
            log.warn("Invalid internal service key attempt rejected");
            sendUnauthorized(response, "Invalid internal service key");
            return;
        }

        String callingService = request.getHeader(SERVICE_NAME_HEADER);
        if (callingService == null || callingService.isBlank()) {
            callingService = "internal-service";
        }

        InternalServicePrincipal principal = new InternalServicePrincipal(callingService);
        CadenceInternalAuthenticationToken authentication = new CadenceInternalAuthenticationToken(principal);

        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(String.format("{\"error\":\"unauthorized\",\"message\":\"%s\"}", message));
        response.getWriter().flush();
    }
}
