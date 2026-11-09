package com.cadence.content.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrillPlanDto {

    private UUID id;

    @JsonProperty("user_id")
    private UUID userId;

    @JsonProperty("source_report_id")
    private UUID sourceReportId;

    private String status;

    @JsonProperty("generation_summary")
    private Map<String, Object> generationSummary;

    @JsonProperty("created_at")
    private OffsetDateTime createdAt;

    @Builder.Default
    private List<DrillPlanItemDto> items = new ArrayList<>();
}

