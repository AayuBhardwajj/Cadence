package com.cadence.practice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PracticeSessionState {
    private UUID sessionId;
    private UUID userId;
    private String bucket;
    private String status;
    private Integer totalAttempts;
    private Integer successfulAttempts;
    private String lastTargetText;
    private String lastTranscribedText;
    private Boolean lastIsMatch;
    private Double lastWer;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime completedAt;
}
