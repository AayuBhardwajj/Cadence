package com.cadence.report.dto;

import com.cadence.report.entity.AssessmentReport;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AssessmentReportResponse(
    @JsonProperty("id") UUID id,
    @JsonProperty("assessment_session_id") UUID assessmentSessionId,
    @JsonProperty("transcription") String transcription,
    @JsonProperty("overall_score") Integer overallScore,
    @JsonProperty("pronunciation_score") Integer pronunciationScore,
    @JsonProperty("fluency_score") Integer fluencyScore,
    @JsonProperty("clarity_score") Integer clarityScore,
    @JsonProperty("grammar_score") Integer grammarScore,
    @JsonProperty("vocabulary_score") Integer vocabularyScore,
    @JsonProperty("confidence_score") Integer confidenceScore,
    @JsonProperty("cefr_level") String cefrLevel,
    @JsonProperty("wpm") Integer wpm,
    @JsonProperty("filler_word_count") Integer fillerWordCount,
    @JsonProperty("eye_contact_score") Integer eyeContactScore,
    @JsonProperty("strengths") List<String> strengths,
    @JsonProperty("focus_areas") List<String> focusAreas,
    @JsonProperty("feedback") String feedback,
    @JsonProperty("weak_areas") String weakAreas,
    @JsonProperty("created_at") OffsetDateTime createdAt
) {
    public static AssessmentReportResponse fromEntity(AssessmentReport entity) {
        if (entity == null) {
            return null;
        }
        return new AssessmentReportResponse(
            entity.getId(),
            entity.getAssessmentSessionId(),
            entity.getTranscription(),
            entity.getOverallScore(),
            entity.getPronunciationScore(),
            entity.getFluencyScore(),
            entity.getClarityScore(),
            entity.getGrammarScore(),
            entity.getVocabularyScore(),
            entity.getConfidenceScore(),
            entity.getCefrLevel(),
            entity.getWpm(),
            entity.getFillerWordCount(),
            entity.getEyeContactScore(),
            entity.getStrengths(),
            entity.getFocusAreas(),
            entity.getFeedback(),
            entity.getWeakAreas(),
            entity.getCreatedAt()
        );
    }
}
