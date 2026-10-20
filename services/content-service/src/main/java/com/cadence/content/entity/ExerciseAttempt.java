package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "exercise_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExerciseAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;

    @Column(name = "response_text", nullable = false, columnDefinition = "TEXT")
    private String responseText;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(nullable = false)
    @Builder.Default
    private Integer score = 0;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String feedback;

    @CreationTimestamp
    @Column(name = "attempted_at", nullable = false, updatable = false)
    private OffsetDateTime attemptedAt;
}
