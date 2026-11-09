package com.cadence.content.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrillPlanItemDto {

    private UUID id;

    @JsonProperty("plan_id")
    private UUID planId;

    private Integer position;

    private Short level;

    @JsonProperty("target_kind")
    private String targetKind;

    @JsonProperty("target_value")
    private String targetValue;

    @JsonProperty("trigger_word")
    private String triggerWord;

    @JsonProperty("phrase_text")
    private String phraseText;

    @JsonProperty("phrase_source")
    private String phraseSource;

    @JsonProperty("completed_at")
    private OffsetDateTime completedAt;
}

