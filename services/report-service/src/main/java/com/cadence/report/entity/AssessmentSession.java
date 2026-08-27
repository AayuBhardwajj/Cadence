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
 * Intentionally minimal mapping of public.assessment_sessions for report-service.
 *
 * ARCHITECTURAL NOTICE (DECISIONS.md D6, D17 point 4):
 * session-service (com.cadence.session.entity.AssessmentSession) remains the EXCLUSIVE
 * canonical full model owner for assessment_sessions.
 *
 * report-service only defines write access to the three lifecycle transition columns
 * needed upon report generation: status, completed_at, and failure_reason.
 *
 * DO NOT add other columns (user_id, topic_id, duration_seconds, audio_storage_path, etc.)
 * to this entity. This strict boundary avoids duplicate-entity schema drift across service
 * boundaries (precedent: the transcript_alignment.py duplication bug documented in
 * BUGS_AND_ISSUES.md).
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

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "failure_reason")
    private String failureReason;
}
