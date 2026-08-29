package com.cadence.session.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record StartPracticeSessionResponse(
        UUID sessionId,
        UUID userId,
        String bucket,
        String status,
        OffsetDateTime createdAt
) {}
