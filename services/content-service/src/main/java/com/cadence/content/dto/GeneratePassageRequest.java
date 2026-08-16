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
public class GeneratePassageRequest {
    private String difficulty;
    private String topic;
    @JsonProperty("issue_type")
    private String issueType;
    @JsonProperty("word_count")
    private Integer wordCount;
    @JsonProperty("sessionId")
    private String sessionId;
    @JsonProperty("session_id")
    private String sessionIdSnake;

    public String getResolvedSessionId() {
        return sessionId != null ? sessionId : sessionIdSnake;
    }
}
