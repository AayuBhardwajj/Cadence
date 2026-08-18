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
                .overallScore(request.getOverallScore())
                .pronunciationScore(request.getPronunciationScore())
                .fluencyScore(request.getFluencyScore())
                .clarityScore(request.getClarityScore())
                .grammarScore(request.getGrammarScore())
                .vocabularyScore(request.getVocabularyScore())
                .confidenceScore(request.getConfidenceScore())
                .cefrLevel(request.getCefrLevel())
                .wpm(request.getWpm())
                .fillerWordCount(request.getFillerWordCount())
                .eyeContactScore(request.getEyeContactScore())
                .strengths(request.getStrengths())
                .focusAreas(request.getFocusAreas())
                .feedback(request.getFeedback())
                .createdAt(OffsetDateTime.now())
                .build();

        AssessmentReport saved = reportRepository.save(report);
        return AssessmentReportResponse.fromEntity(saved);
    }
}

