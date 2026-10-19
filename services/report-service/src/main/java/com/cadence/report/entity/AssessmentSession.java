package com.cadence.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Read-only projection of public.assessment_sessions for report-service ownership checks.
 *
 * ARCHITECTURAL NOTICE (DECISIONS.md D6, D17 point 4):
 * session-service remains the EXCLUSIVE canonical owner of assessment_sessions.
 * report-service adds user_id as a read-only (insertable=false, updatable=false) field
 * solely for security ownership verification during report retrieval.
 *
 * DO NOT add other columns (topic_id, duration_seconds, audio_storage_path, etc.)
 * to this entity. Only the minimum fields needed for security and lifecycle transitions
 * are permitted here.
 */
@Entity
@Table(name = "assessment_sessions", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentSession {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    /**
     * Read-only: written exclusively by session-service.
     * Required by report-service only to verify that a session belongs to the requesting learner.
     */
    @Column(name = "user_id", nullable = false, insertable = false, updatable = false)
    private UUID userId;
    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "failure_reason")
    private String failureReason;
}
