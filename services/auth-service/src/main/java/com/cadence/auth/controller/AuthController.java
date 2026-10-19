package com.cadence.auth.controller;

import com.cadence.auth.model.AppUser;
import com.cadence.auth.repository.AppUserRepository;
import com.cadence.security.annotation.CurrentLearnerId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Handles identity-related endpoints for the authenticated user.
 * The JWT is validated upstream by CadenceJwtAuthenticationFilter;
 * by the time a request reaches this controller, the learner identity is resolved.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AppUserRepository userRepository;

    public AuthController(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * GET /auth/me
     * Returns the userId and email for the currently authenticated learner.
     * Requires a valid Supabase JWT with ROLE_LEARNER.
     *
     * @param userId the validated UUID injected via @CurrentLearnerId
     * @return 200 with { userId, email } or 404 if the user row does not exist
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @CurrentLearnerId UUID userId) {

        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new com.cadence.auth.exception.UserNotFoundException(
                        "User not found for id: " + userId));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("userId", user.getId().toString());
        body.put("email", user.getEmail());
        return ResponseEntity.ok(body);
    }
}
