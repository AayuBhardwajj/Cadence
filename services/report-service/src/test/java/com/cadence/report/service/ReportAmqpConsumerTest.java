package com.cadence.report.service;

import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.dto.CreateAssessmentReportRequest;
import com.cadence.report.entity.AssessmentSession;
import com.cadence.report.repository.AssessmentSessionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportAmqpConsumerTest {

    @Mock
    private ReportService reportService;

    @Mock
    private AssessmentSessionRepository sessionRepository;

    @Mock
    private AssessmentNotificationService notificationService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ReportAmqpConsumer amqpConsumer;

    private UUID sessionId;
    private UUID reportId;

    @BeforeEach
    void setUp() {
        sessionId = UUID.randomUUID();
        reportId = UUID.randomUUID();
    }

    @Test
    void whenAnalysisCompleted_success_persistsReport_updatesSession_andBroadcastsReportReady() throws Exception {
        String payload = """
        {
          "session_id": "%s",
          "user_id": "user-123",
          "topic_id": "interview",
          "audio_data": {
            "transcription": "Test speech transcription.",
            "wpm": 135.5,
            "filler_count": 2.0
          },
          "score_data": {
            "overall_score": 85.66,
            "cefr_level": "B2",
            "breakdown": {
              "pronunciation": 80.0,
              "fluency": 88.5,
              "clarity": 82.0,
              "grammar": 90.0,
              "vocabulary": 85.0,
              "confidence": 87.0,
              "eye_contact": 75.0
            },
            "strengths": ["Clear tone", "Good vocabulary"],
            "focus_areas": ["Pacing"],
            "feedback": "Great delivery."
          }
        }
        """.formatted(sessionId);

        AssessmentReportResponse reportResponse = new AssessmentReportResponse(
                reportId, sessionId, "Test speech transcription.",
                86, 80, 89, 82, 90, 85, 87, "B2", 136, 2, 75,
                List.of("Clear tone"), List.of("Pacing"), "Great delivery.", null,
                null, null, null, null, null, null, null, null, null, null, OffsetDateTime.now()
        );

        when(reportService.createReport(any(CreateAssessmentReportRequest.class))).thenReturn(reportResponse);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(
                AssessmentSession.builder().id(sessionId).status("uploading").build()
        ));

        amqpConsumer.handleAnalysisCompleted(objectMapper.readTree(payload));

        // 1. Verify reportService.createReport called with expected request mapping
        ArgumentCaptor<CreateAssessmentReportRequest> requestCaptor = ArgumentCaptor.forClass(CreateAssessmentReportRequest.class);
        verify(reportService).createReport(requestCaptor.capture());
        CreateAssessmentReportRequest req = requestCaptor.getValue();
        assertThat(req.getAssessmentSessionId()).isEqualTo(sessionId);
        assertThat(req.getOverallScore()).isEqualTo(85.66);
        assertThat(req.getFluencyScore()).isEqualTo(88.5);

        // 2. Verify assessment_sessions transition to completed
        ArgumentCaptor<AssessmentSession> sessionCaptor = ArgumentCaptor.forClass(AssessmentSession.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        AssessmentSession savedSession = sessionCaptor.getValue();
        assertThat(savedSession.getStatus()).isEqualTo("completed");
        assertThat(savedSession.getCompletedAt()).isNotNull();
        assertThat(savedSession.getFailureReason()).isNull();

        // 3. Verify WebSocket broadcast of REPORT_READY
        verify(notificationService).sendReportReady(sessionId, reportId);
        verify(notificationService, never()).sendAssessmentFailed(any(), any());
    }

    @Test
    void whenAnalysisCompleted_fails_updatesSessionFailed_broadcastsFailed_andThrowsReject() throws Exception {
        String payload = """
        {
          "session_id": "%s",
          "user_id": "user-123",
          "audio_data": {},
          "score_data": {}
        }
        """.formatted(sessionId);

        when(reportService.createReport(any(CreateAssessmentReportRequest.class)))
                .thenThrow(new RuntimeException("Database connection timeout"));
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(
                AssessmentSession.builder().id(sessionId).status("uploading").build()
        ));

        assertThatThrownBy(() -> amqpConsumer.handleAnalysisCompleted(objectMapper.readTree(payload)))
                .isInstanceOf(AmqpRejectAndDontRequeueException.class)
                .hasMessageContaining("Fatal error in analysis.completed consumer");

        // Verify session marked failed
        ArgumentCaptor<AssessmentSession> sessionCaptor = ArgumentCaptor.forClass(AssessmentSession.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        AssessmentSession savedSession = sessionCaptor.getValue();
        assertThat(savedSession.getStatus()).isEqualTo("failed");
        assertThat(savedSession.getFailureReason()).contains("Database connection timeout");

        // Verify ASSESSMENT_FAILED broadcast
        verify(notificationService).sendAssessmentFailed(eq(sessionId), contains("Database connection timeout"));
        verify(notificationService, never()).sendReportReady(any(), any());
    }

    @Test
    void whenRecommendationsUpdated_broadcastsRecommendationsReady() throws Exception {
        String payload = """
        {
          "event": "recommendations.updated",
          "session_id": "%s",
          "user_id": "user-123",
          "timestamp": "2026-08-23T12:00:00Z"
        }
        """.formatted(sessionId);

        amqpConsumer.handleRecommendationsUpdated(objectMapper.readTree(payload));

        verify(notificationService).sendRecommendationsReady(sessionId);
    }
}

