package com.cadence.session.entity;

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

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "topic_id")
    private String topicId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "passage_id")
    private UUID passageId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}
