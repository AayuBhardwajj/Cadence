package com.cadence.content.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseDto {
    private UUID id;
    private UUID lessonId;
    private String title;
    private String instruction;
    private String exerciseType;
    private String promptText;
    private List<Map<String, Object>> options;
    private List<String> hints;
    private Integer orderIndex;
    private boolean completed;
    private Integer previousScore;
    private String previousFeedback;
}
