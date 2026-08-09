package com.cadence.report.service;

import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.entity.AssessmentReport;
import com.cadence.report.repository.AssessmentReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
}
