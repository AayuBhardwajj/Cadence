package com.cadence.report.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Service for broadcasting real-time STOMP WebSocket notifications to connected clients.
 *
 * Destination format (DECISIONS.md D17 point 2, ARCHITECTURE.md:385):
 *   /topic/assessment/{sessionId}  (strictly singular)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendReportReady(UUID sessionId, UUID reportId) {
        String destination = "/topic/assessment/" + sessionId;
        Map<String, Object> payload = Map.of(
                "event", "REPORT_READY",
                "sessionId", sessionId.toString(),
                "reportId", reportId.toString()
        );
        log.info("Broadcasting REPORT_READY to {} for session {}", destination, sessionId);
        messagingTemplate.convertAndSend(destination, payload);
    }

    public void sendRecommendationsReady(UUID sessionId) {
        String destination = "/topic/assessment/" + sessionId;
        Map<String, Object> payload = Map.of(
                "event", "RECOMMENDATIONS_READY",
                "sessionId", sessionId.toString()
        );
        log.info("Broadcasting RECOMMENDATIONS_READY to {} for session {}", destination, sessionId);
        messagingTemplate.convertAndSend(destination, payload);
    }

    public void sendAssessmentFailed(UUID sessionId, String error) {
        String destination = "/topic/assessment/" + (sessionId != null ? sessionId : "unknown");
        Map<String, Object> payload = Map.of(
                "event", "ASSESSMENT_FAILED",
                "sessionId", sessionId != null ? sessionId.toString() : "",
                "error", error != null ? error : "An unexpected error occurred"
        );
        log.error("Broadcasting ASSESSMENT_FAILED to {} for session {}: {}", destination, sessionId, error);
        messagingTemplate.convertAndSend(destination, payload);
    }
}
