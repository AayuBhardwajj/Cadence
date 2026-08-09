package com.cadence.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "assessment_reports", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentReport {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "assessment_session_id", nullable = false)
    private UUID assessmentSessionId;

    @Column(name = "transcription")
    private String transcription;

    @Column(name = "overall_score")
    private Integer overallScore;

    @Column(name = "pronunciation_score")
    private Integer pronunciationScore;

    @Column(name = "fluency_score")
    private Integer fluencyScore;

    @Column(name = "clarity_score")
    private Integer clarityScore;

    @Column(name = "grammar_score")
    private Integer grammarScore;

    @Column(name = "vocabulary_score")
    private Integer vocabularyScore;

    @Column(name = "confidence_score")
    private Integer confidenceScore;

    @Column(name = "cefr_level")
    private String cefrLevel;

    @Column(name = "wpm")
    private Integer wpm;

    @Column(name = "filler_word_count")
    private Integer fillerWordCount;

    @Column(name = "eye_contact_score")
    private Integer eyeContactScore;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "strengths", columnDefinition = "text[]")
    private List<String> strengths;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "focus_areas", columnDefinition = "text[]")
    private List<String> focusAreas;

    @Column(name = "feedback")
    private String feedback;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "weak_areas", columnDefinition = "jsonb")
    private String weakAreas;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
