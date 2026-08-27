package com.cadence.report.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AssessmentNotificationServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private AssessmentNotificationService notificationService;

    private UUID sessionId;
    private UUID reportId;

    @BeforeEach
    void setUp() {
        sessionId = UUID.randomUUID();
        reportId = UUID.randomUUID();
    }

    @Test
    void sendReportReady_broadcastsToSingularTopic() {
        notificationService.sendReportReady(sessionId, reportId);

        String expectedDestination = "/topic/assessment/" + sessionId;
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(messagingTemplate).convertAndSend(eq(expectedDestination), captor.capture());

        Map<String, Object> payload = captor.getValue();
        assertThat(payload.get("event")).isEqualTo("REPORT_READY");
        assertThat(payload.get("sessionId")).isEqualTo(sessionId.toString());
        assertThat(payload.get("reportId")).isEqualTo(reportId.toString());
    }

    @Test
    void sendRecommendationsReady_broadcastsToSingularTopic() {
        notificationService.sendRecommendationsReady(sessionId);

        String expectedDestination = "/topic/assessment/" + sessionId;
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(messagingTemplate).convertAndSend(eq(expectedDestination), captor.capture());

        Map<String, Object> payload = captor.getValue();
        assertThat(payload.get("event")).isEqualTo("RECOMMENDATIONS_READY");
        assertThat(payload.get("sessionId")).isEqualTo(sessionId.toString());
    }

    @Test
    void sendAssessmentFailed_broadcastsToSingularTopic() {
        notificationService.sendAssessmentFailed(sessionId, "Database error");

        String expectedDestination = "/topic/assessment/" + sessionId;
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(messagingTemplate).convertAndSend(eq(expectedDestination), captor.capture());

        Map<String, Object> payload = captor.getValue();
        assertThat(payload.get("event")).isEqualTo("ASSESSMENT_FAILED");
        assertThat(payload.get("sessionId")).isEqualTo(sessionId.toString());
        assertThat(payload.get("error")).isEqualTo("Database error");
    }
}
