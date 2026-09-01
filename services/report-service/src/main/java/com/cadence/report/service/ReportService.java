package com.cadence.report.service;

import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.dto.CreateAssessmentReportRequest;
import com.cadence.report.entity.AssessmentReport;
import com.cadence.report.repository.AssessmentReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AssessmentReportRepository reportRepository;

    @Transactional(readOnly = true)
    public Optional<AssessmentReportResponse> getReportBySessionId(UUID sessionId) {
        return reportRepository.findByAssessmentSessionId(sessionId)
                .map(AssessmentReportResponse::fromEntity);
    }

    @Transactional
    public AssessmentReportResponse createReport(CreateAssessmentReportRequest request) {
        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .assessmentSessionId(request.getAssessmentSessionId())
                .transcription(request.getTranscription())
                .overallScore(roundScore(request.getOverallScore()))
                .pronunciationScore(roundScore(request.getPronunciationScore()))
                .fluencyScore(roundScore(request.getFluencyScore()))
                .clarityScore(roundScore(request.getClarityScore()))
                .grammarScore(roundScore(request.getGrammarScore()))
                .vocabularyScore(roundScore(request.getVocabularyScore()))
                .confidenceScore(roundScore(request.getConfidenceScore()))
                .cefrLevel(request.getCefrLevel())
                .wpm(roundScore(request.getWpm()))
                .fillerWordCount(roundScore(request.getFillerWordCount()))
                .eyeContactScore(roundScore(request.getEyeContactScore()))
                .strengths(request.getStrengths())
                .focusAreas(request.getFocusAreas())
                .feedback(request.getFeedback())
                .amcatMetrics(request.getAmcatMetrics())
                .amcatInsights(request.getAmcatInsights())
                .amcatErrorLog(request.getAmcatErrorLog())
                .amcatSentences(request.getAmcatSentences())
                .amcatMtiDeepDive(request.getAmcatMtiDeepDive())
                .amcatSummary(request.getAmcatSummary())
                .improvementPlan(request.getImprovementPlan())
                .practiceExercises(request.getPracticeExercises())
                .grammarErrors(request.getGrammarErrors())
                .nextTopicSuggestion(request.getNextTopicSuggestion())
                .createdAt(OffsetDateTime.now())
                .build();

        AssessmentReport saved = reportRepository.save(report);
        return AssessmentReportResponse.fromEntity(saved);
    }

    private Integer roundScore(Double score) {
        return score != null ? (int) Math.round(score) : null;
    }
}

