package com.cadence.report.dto;

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
}
