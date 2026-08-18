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
    private Integer overallScore;
    private Integer pronunciationScore;
    private Integer fluencyScore;
    private Integer clarityScore;
    private Integer grammarScore;
    private Integer vocabularyScore;
    private Integer confidenceScore;
    private String cefrLevel;
    private Integer wpm;
    private Integer fillerWordCount;
    private Integer eyeContactScore;
    private List<String> strengths;
    private List<String> focusAreas;
    private String feedback;
}
