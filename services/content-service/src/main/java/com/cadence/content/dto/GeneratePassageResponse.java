package com.cadence.content.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratePassageResponse {
    @JsonProperty("passage_id")
    private String passageId;
    @JsonProperty("passage_text")
    private String passageText;
    private String difficulty;
    private String topic;
    @JsonProperty("target_words")
    private Object targetWords;
    @JsonProperty("generated_at")
    private String generatedAt;
    private String source;
    @JsonProperty("topic_prompt")
    private String topicPrompt;
}
