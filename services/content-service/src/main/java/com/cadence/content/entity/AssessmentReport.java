package com.cadence.content.entity;

import jakarta.persistence.*;
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
    private UUID id;

    @Column(name = "assessment_session_id", nullable = false)
    private UUID assessmentSessionId;

    @Column(name = "overall_score")
    private Integer overallScore;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "focus_areas")
    private List<String> focusAreas;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
