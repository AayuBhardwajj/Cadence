package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "course_enrollments", uniqueConstraints = {
        @UniqueConstraint(name = "uq_course_enrollment", columnNames = {"course_id", "learner_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;

    @CreationTimestamp
    @Column(name = "enrolled_at", nullable = false, updatable = false)
    private OffsetDateTime enrolledAt;

    @UpdateTimestamp
    @Column(name = "last_accessed_at", nullable = false)
    private OffsetDateTime lastAccessedAt;

    @Column(name = "current_lesson_id")
    private UUID currentLessonId;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}
