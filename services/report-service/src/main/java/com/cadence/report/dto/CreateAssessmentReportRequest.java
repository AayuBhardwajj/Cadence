package com.cadence.report.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAssessmentReportRequest {

    @NotNull(message = "assessmentSessionId is required")
    private UUID assessmentSessionId;

    private String transcription;
    private Double overallScore;
    private Double pronunciationScore;
    private Double fluencyScore;
    private Double clarityScore;
    private Double grammarScore;
    private Double vocabularyScore;
    private Double confidenceScore;
    private String cefrLevel;
    private Double wpm;
    private Double fillerWordCount;
    private Double eyeContactScore;
    private List<String> strengths;
    private List<String> focusAreas;
    private String feedback;

    private JsonNode amcatMetrics;
    private JsonNode amcatInsights;
    private JsonNode amcatErrorLog;
    private JsonNode amcatSentences;
    private JsonNode amcatMtiDeepDive;
    private JsonNode amcatSummary;
    private JsonNode improvementPlan;
    private JsonNode practiceExercises;
    private JsonNode grammarErrors;
    private String nextTopicSuggestion;
}
