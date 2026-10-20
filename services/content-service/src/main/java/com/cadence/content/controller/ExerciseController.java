package com.cadence.content.controller;

import com.cadence.content.dto.ExerciseAttemptRequest;
import com.cadence.content.dto.ExerciseAttemptResponse;
import com.cadence.content.security.CurrentLearnerId;
import com.cadence.content.service.ExerciseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
@Slf4j
public class ExerciseController {

    private final ExerciseService exerciseService;

    @PostMapping("/{id}/attempt")
    public ResponseEntity<ExerciseAttemptResponse> submitAttempt(
            @PathVariable("id") UUID exerciseId,
            @Valid @RequestBody ExerciseAttemptRequest request,
            @CurrentLearnerId UUID currentLearnerId
    ) {
        ExerciseAttemptResponse response = exerciseService.submitAttempt(
                exerciseId,
                currentLearnerId,
                request.getResponseText()
        );
        return ResponseEntity.ok(response);
    }
}
