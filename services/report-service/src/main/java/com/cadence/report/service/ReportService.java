
package com.cadence.report.service;

import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.dto.CreateAssessmentReportRequest;
import com.cadence.report.entity.AssessmentReport;
import com.cadence.report.repository.AssessmentReportRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private final AssessmentReportRepository reportRepository;

    @Transactional(readOnly = true)
    public Optional<AssessmentReportResponse> getReportBySessionId(
            UUID sessionId) {

        log.info(
                "Unrestricted report lookup started: sessionId={}",
                sessionId);

        Optional<AssessmentReport> result = reportRepository.findByAssessmentSessionId(sessionId);

        log.info(
                "Unrestricted report lookup completed: sessionId={}, found={}",
                sessionId,
                result.isPresent());

        return result.map(AssessmentReportResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Optional<AssessmentReportResponse> getReportBySessionIdAndLearnerId(
            UUID sessionId,
            UUID learnerId) {

        log.info(
                "Report lookup started: sessionId={}, learnerId={}",
                sessionId,
                learnerId);

        Optional<AssessmentReport> result = reportRepository.findBySessionIdAndUserId(
                sessionId,
                learnerId);

        log.info(
                "Report lookup completed: sessionId={}, learnerId={}, found={}",
                sessionId,
                learnerId,
                result.isPresent());

        return result.map(AssessmentReportResponse::fromEntity);
    }

    @Transactional
    public AssessmentReportResponse createReport(
            CreateAssessmentReportRequest request) {

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .assessmentSessionId(request.getAssessmentSessionId())
                .transcription(request.getTranscription())
                .referencePassageText(request.getReferencePassageText())
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

        log.info(
                "Assessment report created: reportId={}, sessionId={}",
                saved.getId(),
                saved.getAssessmentSessionId());

        return AssessmentReportResponse.fromEntity(saved);
    }

    private Integer roundScore(Double score) {
        return score != null
                ? (int) Math.round(score)
                : null;
    }
}
