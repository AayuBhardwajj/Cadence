package com.cadence.content.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonDetailDto {
    private UUID id;
    private UUID courseId;
    private String courseTitle;
    private UUID moduleId;
    private String moduleTitle;
    private String title;
    private String description;
    private Integer orderIndex;
    private Integer durationMinutes;
    private String contentMarkdown;
    private List<String> keyTakeaways;
    private boolean completed;
    private UUID nextLessonId;
    private UUID prevLessonId;
    private List<ExerciseDto> exercises;
}
