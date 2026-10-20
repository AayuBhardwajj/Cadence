package com.cadence.content.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseSummaryDto {
    private UUID id;
    private String title;
    private String slug;
    private String description;
    private String shortDescription;
    private String level;
    private String category;
    private Integer estimatedMinutes;
    private String thumbnailUrl;
    private long totalLessons;
    private long completedLessons;
    private int progressPercent;
    private boolean enrolled;
    private UUID currentLessonId;
}
