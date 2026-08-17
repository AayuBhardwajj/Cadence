package com.cadence.session.controller;

import com.cadence.session.dto.StartSessionResponse;
import com.cadence.session.service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/assessment")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @PostMapping("/start")
    public ResponseEntity<?> startAssessment(@RequestParam(value = "user_id", required = false) String userIdStr) {
        if (userIdStr == null || userIdStr.trim().length() < 10) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("detail", "Invalid or missing user identity."));
        }

        UUID userId;
        try {
            userId = UUID.fromString(userIdStr.trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("detail", "Invalid or missing user identity."));
        }

        try {
            StartSessionResponse response = sessionService.createSession(userId);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode())
                    .body(Map.of("detail", rse.getReason() != null ? rse.getReason() : "Error starting assessment"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("detail", "An internal error occurred. Please try again."));
        }
    }
}
