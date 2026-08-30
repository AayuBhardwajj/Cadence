package com.cadence.practice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CompletePracticeSessionResponse(
        UUID sessionId,
        String status,
        OffsetDateTime completedAt
) {}
