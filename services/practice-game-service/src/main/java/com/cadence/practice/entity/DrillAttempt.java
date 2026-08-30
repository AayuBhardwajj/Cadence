package com.cadence.practice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "drill_attempts", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrillAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "practice_session_id", nullable = false)
    private UUID practiceSessionId;

    @Column(name = "target_text", nullable = false)
    private String targetText;

    @Column(name = "transcribed_text")
    private String transcribedText;

    @Column(name = "is_match", nullable = false)
    private Boolean isMatch;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
