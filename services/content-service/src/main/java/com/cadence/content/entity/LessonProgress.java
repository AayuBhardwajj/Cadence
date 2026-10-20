package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "lesson_progress", uniqueConstraints = {
        @UniqueConstraint(name = "uq_lesson_learner", columnNames = {"lesson_id", "learner_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;

    @Column(nullable = false)
    @Builder.Default
    private Boolean completed = false;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @UpdateTimestamp
    @Column(name = "last_accessed_at", nullable = false)
    private OffsetDateTime lastAccessedAt;
}
