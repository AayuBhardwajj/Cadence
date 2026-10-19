package com.cadence.auth.controller;

import com.cadence.security.exception.InvalidTokenException;
import com.cadence.security.jwt.JwtClaims;
import com.cadence.security.jwt.JwtValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Internal endpoint used by internal services to validate
 * a Supabase JWT and extract its claims using the shared security starter validator.
 *
 * POST /auth/validate
 *   Header:  X-Internal-Service-Key: <key>
 *   Header:  Authorization: Bearer <token>
 *   200 → { valid: true,  userId: "...", email: "..." }
 *   401 → { valid: false, error: "..." }
 *
 * Secured with ROLE_INTERNAL_SERVICE via CadenceInternalAuthFilter.
 */
@RestController
@RequestMapping("/auth")
public class TokenValidateController {

    private final JwtValidator jwtValidator;

    public TokenValidateController(JwtValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validate(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return buildError("Missing or malformed Authorization header");
        }

        String token = authHeader.substring(7).trim();
        if (token.isEmpty()) {
            return buildError("Empty bearer token");
        }

        try {
            JwtClaims claims = jwtValidator.validate(token);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("valid", true);
            body.put("userId", claims.subject());
            body.put("email", claims.email());
            return ResponseEntity.ok(body);

        } catch (InvalidTokenException e) {
            return buildError(e.getMessage());
        } catch (Exception e) {
            return buildError("Token validation failed");
        }
    }

    private ResponseEntity<Map<String, Object>> buildError(String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("valid", false);
        body.put("error", message);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }
}
