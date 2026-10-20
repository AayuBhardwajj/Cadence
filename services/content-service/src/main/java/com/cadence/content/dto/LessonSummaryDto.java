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
public class LessonSummaryDto {
    private UUID id;
    private String title;
    private String description;
    private Integer orderIndex;
    private Integer durationMinutes;
    private boolean completed;
}
