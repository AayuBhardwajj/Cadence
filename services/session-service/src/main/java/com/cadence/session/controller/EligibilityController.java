package com.cadence.session.controller;

import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.service.EligibilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class EligibilityController {

    private final EligibilityService eligibilityService;

    @GetMapping({"/eligibility", "/api/assessment/eligibility"})
    public ResponseEntity<?> getEligibility(@RequestParam(value = "user_id", required = false) String userIdStr) {
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

        EligibilityResponse response = eligibilityService.getEligibility(userId);
        return ResponseEntity.ok(response);
    }
}
