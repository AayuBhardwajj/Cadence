package com.cadence.content.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseAttemptResponse {
    private UUID id;
    private UUID exerciseId;
    private boolean isCorrect;
    private int score;
    private String feedback;
    private OffsetDateTime attemptedAt;
}
