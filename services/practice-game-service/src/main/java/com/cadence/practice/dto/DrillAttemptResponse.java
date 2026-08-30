package com.cadence.practice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DrillAttemptResponse(
        UUID id,
        UUID practiceSessionId,
        String targetText,
        String transcribedText,
        Boolean isMatch,
        Double wer,
        Integer attemptNumber,
        OffsetDateTime createdAt
) {}
