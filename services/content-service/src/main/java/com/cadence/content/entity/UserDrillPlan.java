package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "user_drill_plans", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDrillPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    /**
     * Source assessment report ID reference.
     * Note: Declared without a foreign key constraint per DECISIONS.md D19 / D28 isolation boundary.
     */
    @Column(name = "source_report_id", nullable = false)
    private UUID sourceReportId;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "active";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "generation_summary", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> generationSummary = new HashMap<>();

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position ASC")
    @Builder.Default
    private List<UserDrillPlanItem> items = new ArrayList<>();
}

