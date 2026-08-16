package com.cadence.content.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipResponse {
    private String tip;
    @JsonProperty("is_personalized")
    private boolean isPersonalized;
    @JsonProperty("generated_at")
    private String generatedAt;
    private boolean cached;
}
