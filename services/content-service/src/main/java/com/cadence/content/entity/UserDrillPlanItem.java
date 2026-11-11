package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_drill_plan_items", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDrillPlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    @ToString.Exclude
    private UserDrillPlan plan;

    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "level", nullable = false)
    private Short level;

    @Column(name = "target_kind", nullable = false)
    private String targetKind;

    @Column(name = "target_value", nullable = false)
    private String targetValue;

    @Column(name = "trigger_word")
    private String triggerWord;

    @Column(name = "phrase_text", nullable = false, columnDefinition = "TEXT")
    private String phraseText;

    @Column(name = "phrase_source", nullable = false)
    private String phraseSource;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "from_report", nullable = false)
    @Builder.Default
    private Boolean fromReport = false;

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private Integer attempts = 0;

    @Column(name = "passed_attempts", nullable = false)
    @Builder.Default
    private Integer passedAttempts = 0;

    @Column(name = "last_attempt_at")
    private OffsetDateTime lastAttemptAt;
}

