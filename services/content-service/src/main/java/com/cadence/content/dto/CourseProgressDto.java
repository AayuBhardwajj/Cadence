package com.cadence.content.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseProgressDto {
    private UUID courseId;
    private boolean enrolled;
    private long totalLessons;
    private long completedLessons;
    private int progressPercent;
    private UUID currentLessonId;
    private OffsetDateTime enrolledAt;
    private OffsetDateTime completedAt;
    private List<UUID> completedLessonIds;
}
