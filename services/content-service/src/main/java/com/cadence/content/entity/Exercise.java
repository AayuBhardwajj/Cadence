package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "exercises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String instruction;

    @Column(name = "exercise_type", nullable = false)
    private String exerciseType;

    @Column(name = "prompt_text", nullable = false, columnDefinition = "TEXT")
    private String promptText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> options = new ArrayList<>();

    @Column(name = "correct_answer", columnDefinition = "TEXT")
    private String correctAnswer;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "hints", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> hints = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rubric", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> rubric = Map.of();

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
