package com.cadence.practice.controller;

import com.cadence.practice.dto.CompletePracticeSessionResponse;
import com.cadence.practice.dto.DrillAttemptResponse;
import com.cadence.practice.dto.StartPracticeSessionResponse;
import com.cadence.practice.model.LevelPhrase;
import com.cadence.practice.model.PracticeSessionState;
import com.cadence.practice.service.LevelContentCacheService;
import com.cadence.practice.service.PracticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/practice")
@RequiredArgsConstructor
@Slf4j
public class PracticeController {

    private final PracticeService practiceService;
    private final LevelContentCacheService levelContentCacheService;

    @GetMapping("/level/{levelId}/phrases")
    public ResponseEntity<?> getLevelPhrases(@PathVariable("levelId") String levelId) {
        try {
            List<LevelPhrase> phrases = levelContentCacheService.getLevelPhrases(levelId);
            return ResponseEntity.ok(phrases);
        } catch (Exception e) {
            log.error("Failed to fetch level phrases for {}: {}", levelId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("detail", "Failed to fetch level phrases"));
        }
    }

    @GetMapping("/session/{sessionId}/state")
    public ResponseEntity<?> getSessionState(@PathVariable("sessionId") String sessionIdStr) {
        UUID sessionId;
        try {
            sessionId = UUID.fromString(sessionIdStr.trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("detail", "Invalid UUID format for sessionId."));
        }

        try {
            PracticeSessionState state = practiceService.getSessionState(sessionId);
            return ResponseEntity.ok(state);
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode())
                    .body(Map.of("detail", rse.getReason() != null ? rse.getReason() : "Failed to fetch session state"));
        } catch (Exception e) {
            log.error("Failed to fetch state for session {}: {}", sessionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("detail", "Internal error fetching session state."));
        }
    }

    @PostMapping("/session")
    public ResponseEntity<?> startSession(
            @RequestParam(value = "user_id", required = false) String userIdStr,
            @RequestParam(value = "bucket", defaultValue = "th_sound") String bucket
    ) {
        if (userIdStr == null || userIdStr.trim().length() < 10) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("detail", "Invalid or missing user identity."));
        }

        UUID userId;
        try {
            userId = UUID.fromString(userIdStr.trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("detail", "Invalid UUID format for user_id."));
        }

        try {
            StartPracticeSessionResponse response = practiceService.startPracticeSession(userId, bucket);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode())
                    .body(Map.of("detail", rse.getReason() != null ? rse.getReason() : "Failed to start practice session"));
        } catch (Exception e) {
            log.error("Failed to start practice session: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("detail", "Internal server error starting practice session."));
        }
    }

    @PostMapping(value = "/attempt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitAttempt(
            @RequestParam(value = "practiceSessionId") String practiceSessionIdStr,
            @RequestParam(value = "targetText") String targetText,
            @RequestParam(value = "attemptNumber", defaultValue = "1") Integer attemptNumber,
            @RequestParam("file") MultipartFile file
    ) {
        if (practiceSessionIdStr == null || practiceSessionIdStr.trim().length() < 10) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("detail", "Invalid or missing practiceSessionId."));
        }

        UUID practiceSessionId;
        try {
            practiceSessionId = UUID.fromString(practiceSessionIdStr.trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("detail", "Invalid UUID format for practiceSessionId."));
        }

        try {
            DrillAttemptResponse response = practiceService.submitDrillAttempt(
                    practiceSessionId,
                    targetText,
                    attemptNumber,
                    file
            );
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode())
                    .body(Map.of("detail", rse.getReason() != null ? rse.getReason() : "Attempt processing failed"));
        } catch (Exception e) {
            log.error("Failed to process drill attempt for session {}: {}", practiceSessionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("detail", "Internal error processing drill attempt."));
        }
    }

    @PostMapping("/session/{sessionId}/complete")
    public ResponseEntity<?> completeSession(@PathVariable("sessionId") String sessionIdStr) {
        UUID sessionId;
        try {
            sessionId = UUID.fromString(sessionIdStr.trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("detail", "Invalid UUID format for sessionId."));
        }

        try {
            CompletePracticeSessionResponse response = practiceService.completePracticeSession(sessionId);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode())
                    .body(Map.of("detail", rse.getReason() != null ? rse.getReason() : "Failed to complete session"));
        } catch (Exception e) {
            log.error("Failed to complete practice session {}: {}", sessionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("detail", "Internal error completing practice session."));
        }
    }
}
