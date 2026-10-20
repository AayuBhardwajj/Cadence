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
public class ModuleDetailDto {
    private UUID id;
    private String title;
    private String description;
    private Integer orderIndex;
    private List<LessonSummaryDto> lessons;
}
