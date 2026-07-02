package com.cadence.auth.controller;

import com.cadence.auth.exception.InvalidTokenException;
import com.cadence.auth.service.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Internal endpoint used by the gateway / other services to validate
 * a Supabase JWT and extract its claims without involving Spring Security.
 *
 * POST /auth/validate
 *   Header:  Authorization: Bearer <token>
 *   200 → { valid: true,  userId: "...", email: "..." }
 *   401 → { valid: false, error: "..." }
 *
 * This endpoint is intentionally permitted without authentication
 * (configured in SecurityConfig) so that the gateway can call it
 * before it has a validated principal to pass downstream.
 */
@RestController
@RequestMapping("/auth")
public class TokenValidateController {

    private final JwtService jwtService;

    public TokenValidateController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validate(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return buildError("Missing or malformed Authorization header");
        }

        String token = authHeader.substring(7).trim();
        try {
            String userId = jwtService.validateAndExtractUserId(token);
            String email  = jwtService.validateAndExtractEmail(token).orElse(null);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("valid", true);
            body.put("userId", userId);
            body.put("email", email);
            return ResponseEntity.ok(body);

        } catch (InvalidTokenException e) {
            return buildError(e.getMessage());
        }
    }

    private ResponseEntity<Map<String, Object>> buildError(String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("valid", false);
        body.put("error", message);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }
}
