package com.cadence.report.service;

import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.dto.CreateAssessmentReportRequest;
import com.cadence.report.entity.AssessmentReport;
import com.cadence.report.repository.AssessmentReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private AssessmentReportRepository reportRepository;

    @InjectMocks
    private ReportService reportService;

    private UUID reportId;
    private UUID sessionId;
    private AssessmentReport sampleReport;

    @BeforeEach
    void setUp() {
        reportId = UUID.randomUUID();
        sessionId = UUID.randomUUID();

        sampleReport = AssessmentReport.builder()
                .id(reportId)
                .assessmentSessionId(sessionId)
                .transcription("Hello world this is a test assessment.")
                .overallScore(85)
                .pronunciationScore(80)
                .fluencyScore(88)
                .clarityScore(82)
                .grammarScore(90)
                .vocabularyScore(85)
                .confidenceScore(87)
                .cefrLevel("B2")
                .wpm(135)
                .fillerWordCount(2)
                .eyeContactScore(0)
                .strengths(List.of("Good pacing", "Clear articulation"))
                .focusAreas(List.of("Reduce filler words"))
                .feedback("Overall strong performance with minor filler words.")
                .weakAreas(null)
                .createdAt(OffsetDateTime.now())
                .build();
    }

    @Test
    void whenReportExists_returnsReportResponse() {
        when(reportRepository.findByAssessmentSessionId(sessionId))
                .thenReturn(Optional.of(sampleReport));

        Optional<AssessmentReportResponse> result = reportService.getReportBySessionId(sessionId);

        assertThat(result).isPresent();
        AssessmentReportResponse response = result.get();
        assertThat(response.id()).isEqualTo(reportId);
        assertThat(response.assessmentSessionId()).isEqualTo(sessionId);
        assertThat(response.overallScore()).isEqualTo(85);
        assertThat(response.cefrLevel()).isEqualTo("B2");
        assertThat(response.strengths()).containsExactly("Good pacing", "Clear articulation");
        assertThat(response.weakAreas()).isNull();
    }

    @Test
    void whenReportMissing_returnsEmptyOptional() {
        UUID nonExistentSessionId = UUID.randomUUID();
        when(reportRepository.findByAssessmentSessionId(nonExistentSessionId))
                .thenReturn(Optional.empty());

        Optional<AssessmentReportResponse> result = reportService.getReportBySessionId(nonExistentSessionId);

        assertThat(result).isEmpty();
    }

    @Test
    void whenCreateReport_savesReportWithExplicitCreatedAt() {
        CreateAssessmentReportRequest request = CreateAssessmentReportRequest.builder()
                .assessmentSessionId(sessionId)
                .transcription("Hello world this is a test assessment.")
                .overallScore(85.0)
                .pronunciationScore(80.0)
                .fluencyScore(88.0)
                .clarityScore(82.0)
                .grammarScore(90.0)
                .vocabularyScore(85.0)
                .confidenceScore(87.0)
                .cefrLevel("B2")
                .wpm(135.0)
                .fillerWordCount(2.0)
                .eyeContactScore(0.0)
                .strengths(List.of("Good pacing"))
                .focusAreas(List.of("Reduce filler words"))
                .feedback("Overall strong performance.")
                .build();

        when(reportRepository.save(any(AssessmentReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssessmentReportResponse response = reportService.createReport(request);

        ArgumentCaptor<AssessmentReport> captor = ArgumentCaptor.forClass(AssessmentReport.class);
        verify(reportRepository).save(captor.capture());

        AssessmentReport savedReport = captor.getValue();
        assertThat(savedReport.getId()).isNotNull();
        assertThat(savedReport.getAssessmentSessionId()).isEqualTo(sessionId);
        assertThat(savedReport.getCreatedAt()).isNotNull();
        assertThat(savedReport.getOverallScore()).isEqualTo(85);

        assertThat(response).isNotNull();
        assertThat(response.assessmentSessionId()).isEqualTo(sessionId);
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    void whenCreateReport_roundsFloatingPointScoresCorrectly() {
        CreateAssessmentReportRequest request = CreateAssessmentReportRequest.builder()
                .assessmentSessionId(sessionId)
                .transcription("Precision test sample.")
                .overallScore(85.66)
                .pronunciationScore(75.4)
                .fluencyScore(92.8)
                .clarityScore(99.6)
                .grammarScore(70.2)
                .vocabularyScore(91.5)
                .confidenceScore(77.1)
                .cefrLevel("B1")
                .wpm(141.4)
                .fillerWordCount(1.6)
                .eyeContactScore(84.7)
                .strengths(List.of("Good vocabulary"))
                .focusAreas(List.of("Grammar"))
                .feedback("Solid speech.")
                .build();

        when(reportRepository.save(any(AssessmentReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssessmentReportResponse response = reportService.createReport(request);

        ArgumentCaptor<AssessmentReport> captor = ArgumentCaptor.forClass(AssessmentReport.class);
        verify(reportRepository).save(captor.capture());

        AssessmentReport savedReport = captor.getValue();
        // 85.66 must round to 86 (not truncate to 85)
        assertThat(savedReport.getOverallScore()).isEqualTo(86);
        // 75.4 must round to 75
        assertThat(savedReport.getPronunciationScore()).isEqualTo(75);
        // 92.8 must round to 93
        assertThat(savedReport.getFluencyScore()).isEqualTo(93);
        // 99.6 must round to 100
        assertThat(savedReport.getClarityScore()).isEqualTo(100);
        // 70.2 must round to 70
        assertThat(savedReport.getGrammarScore()).isEqualTo(70);
        // 91.5 must round to 92
        assertThat(savedReport.getVocabularyScore()).isEqualTo(92);
        // 77.1 must round to 77
        assertThat(savedReport.getConfidenceScore()).isEqualTo(77);
        // 141.4 must round to 141
        assertThat(savedReport.getWpm()).isEqualTo(141);
        // 1.6 must round to 2
        assertThat(savedReport.getFillerWordCount()).isEqualTo(2);
        // 84.7 must round to 85
        assertThat(savedReport.getEyeContactScore()).isEqualTo(85);

        assertThat(response.overallScore()).isEqualTo(86);
        assertThat(response.wpm()).isEqualTo(141);
        assertThat(response.fillerWordCount()).isEqualTo(2);
        assertThat(response.eyeContactScore()).isEqualTo(85);
    }

    @Test
    void whenCreateReport_diagnosticJsonNodeFieldsRoundTripCorrectly() throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.JsonNode metricsNode = mapper.readTree("{\"pronunciation\":{\"score\":80}}");
        com.fasterxml.jackson.databind.JsonNode insightsNode = mapper.readTree("[{\"dimension\":\"Fluency\",\"score\":75}]");
        com.fasterxml.jackson.databind.JsonNode errorLogNode = mapper.readTree("[{\"word\":\"test\",\"error_type\":\"substitution\"}]");
        com.fasterxml.jackson.databind.JsonNode sentencesNode = mapper.readTree("[{\"text\":\"Sentence one.\"}]");
        com.fasterxml.jackson.databind.JsonNode mtiNode = mapper.readTree("{\"detected_accent\":\"Neutral\"}");
        com.fasterxml.jackson.databind.JsonNode summaryNode = mapper.readTree("{\"top_strengths\":[\"Pacing\"]}");
        com.fasterxml.jackson.databind.JsonNode planNode = mapper.readTree("{\"week_1\":{\"focus\":\"Intonation\"}}");
        com.fasterxml.jackson.databind.JsonNode exercisesNode = mapper.readTree("[{\"title\":\"Shadowing\"}]");
        com.fasterxml.jackson.databind.JsonNode grammarNode = mapper.readTree("[{\"original\":\"he go\",\"corrected\":\"he goes\"}]");

        CreateAssessmentReportRequest request = CreateAssessmentReportRequest.builder()
                .assessmentSessionId(sessionId)
                .transcription("Diagnostic fields test.")
                .overallScore(80.0)
                .amcatMetrics(metricsNode)
                .amcatInsights(insightsNode)
                .amcatErrorLog(errorLogNode)
                .amcatSentences(sentencesNode)
                .amcatMtiDeepDive(mtiNode)
                .amcatSummary(summaryNode)
                .improvementPlan(planNode)
                .practiceExercises(exercisesNode)
                .grammarErrors(grammarNode)
                .nextTopicSuggestion("Public Speaking Basics")
                .build();

        when(reportRepository.save(any(AssessmentReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssessmentReportResponse response = reportService.createReport(request);

        assertThat(response.amcatMetrics()).isEqualTo(metricsNode);
        assertThat(response.amcatInsights()).isEqualTo(insightsNode);
        assertThat(response.amcatErrorLog()).isEqualTo(errorLogNode);
        assertThat(response.amcatSentences()).isEqualTo(sentencesNode);
        assertThat(response.amcatMtiDeepDive()).isEqualTo(mtiNode);
        assertThat(response.amcatSummary()).isEqualTo(summaryNode);
        assertThat(response.improvementPlan()).isEqualTo(planNode);
        assertThat(response.practiceExercises()).isEqualTo(exercisesNode);
        assertThat(response.grammarErrors()).isEqualTo(grammarNode);
        assertThat(response.nextTopicSuggestion()).isEqualTo("Public Speaking Basics");
    }
}



