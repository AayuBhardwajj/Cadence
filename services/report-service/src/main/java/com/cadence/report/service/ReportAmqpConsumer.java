package com.cadence.report.service;

import com.cadence.report.config.RabbitMQConfig;
import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.dto.CreateAssessmentReportRequest;
import com.cadence.report.entity.AssessmentSession;
import com.cadence.report.repository.AssessmentSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * AMQP Consumer for report-service (Phase 3 Stage 4).
 *
 * Inbound Handlers:
 * 1. analysis.completed (queue: report-service.analysis.completed):
 *    - Persists AssessmentReport via ReportService.createReport() (shared score-rounding fix applied).
 *    - Updates assessment_sessions: status = 'completed', completed_at = OffsetDateTime.now().
 *    - Broadcasts {"event": "REPORT_READY", "sessionId": ..., "reportId": ...} to /topic/assessment/{sessionId}.
 *    - On failure: status = 'failed', failure_reason set; broadcasts {"event": "ASSESSMENT_FAILED", ...};
 *      rejects without requeue (no DLX exists; message is permanently dropped).
 *
 * 2. recommendations.updated (queue: recommendations.updated):
 *    - Signal-only broadcast to /topic/assessment/{sessionId} with {"event": "RECOMMENDATIONS_READY", ...}.
 *    - No database write (DECISIONS.md D15 Q4).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportAmqpConsumer {

    private final ReportService reportService;
    private final AssessmentSessionRepository sessionRepository;
    private final AssessmentNotificationService notificationService;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_ANALYSIS_COMPLETED)
    @Transactional
    public void handleAnalysisCompleted(JsonNode root) {
        UUID sessionId = null;
        try {
            if (root == null) {
                throw new IllegalArgumentException("Received empty or null analysis.completed payload");
            }
            String sessionIdStr = root.path("session_id").asText(null);
            if (sessionIdStr == null || sessionIdStr.isBlank()) {
                throw new IllegalArgumentException("Missing required field 'session_id' in analysis.completed payload");
            }
            sessionId = UUID.fromString(sessionIdStr);

            JsonNode audioData = root.path("audio_data");
            JsonNode scoreData = root.path("score_data");
            JsonNode breakdown = scoreData.path("breakdown");

            CreateAssessmentReportRequest request = CreateAssessmentReportRequest.builder()
                    .assessmentSessionId(sessionId)
                    .transcription(audioData.path("transcription").asText(""))
                    .overallScore(getDoubleOrNull(scoreData, "overall_score"))
                    .pronunciationScore(getDoubleOrNull(breakdown, "pronunciation"))
                    .fluencyScore(getDoubleOrNull(breakdown, "fluency"))
                    .clarityScore(getDoubleOrNull(breakdown, "clarity"))
                    .grammarScore(getDoubleOrNull(breakdown, "grammar"))
                    .vocabularyScore(getDoubleOrNull(breakdown, "vocabulary"))
                    .confidenceScore(getDoubleOrNull(breakdown, "confidence"))
                    .cefrLevel(scoreData.path("cefr_level").asText(null))
                    .wpm(getDoubleOrNull(audioData.has("wpm") ? audioData : breakdown, "wpm"))
                    .fillerWordCount(getDoubleOrNull(audioData.has("filler_count") ? audioData : breakdown, audioData.has("filler_count") ? "filler_count" : "fillers"))
                    .eyeContactScore(getDoubleOrNull(breakdown, "eye_contact"))
                    .strengths(getStringList(scoreData, "strengths"))
                    .focusAreas(getStringList(scoreData, "focus_areas"))
                    .feedback(scoreData.path("feedback").asText(null))
                    .build();

            log.info("report-service.amqp: processing analysis.completed for session={}", sessionId);
            AssessmentReportResponse reportResponse = reportService.createReport(request);

            // Update assessment_sessions lifecycle state to completed
            AssessmentSession session = sessionRepository.findById(sessionId).orElseGet(() ->
                    AssessmentSession.builder().id(request.getAssessmentSessionId()).build()
            );
            session.setStatus("completed");
            session.setCompletedAt(OffsetDateTime.now());
            session.setFailureReason(null);
            sessionRepository.save(session);

            log.info("report-service.amqp: session {} updated status=completed completed_at={}", sessionId, session.getCompletedAt());

            // Broadcast REPORT_READY over STOMP WebSocket
            notificationService.sendReportReady(sessionId, reportResponse.id());

        } catch (Exception e) {
            log.error("report-service.amqp: unhandled failure processing analysis.completed for session={}: {}", sessionId, e.getMessage(), e);

            if (sessionId != null) {
                final UUID finalSessionId = sessionId;
                try {
                    AssessmentSession session = sessionRepository.findById(finalSessionId).orElseGet(() ->
                            AssessmentSession.builder().id(finalSessionId).build()
                    );
                    session.setStatus("failed");
                    session.setFailureReason(e.getMessage());
                    sessionRepository.save(session);
                } catch (Exception dbErr) {
                    log.error("report-service.amqp: failed to record status=failed for session {}: {}", finalSessionId, dbErr.getMessage());
                }
                notificationService.sendAssessmentFailed(finalSessionId, e.getMessage());
            }

            // Reject without requeue (no DLX configured; message is discarded)
            throw new AmqpRejectAndDontRequeueException("Fatal error in analysis.completed consumer", e);
        }
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_RECOMMENDATIONS_UPDATED)
    public void handleRecommendationsUpdated(JsonNode root) {
        try {
            if (root == null) {
                log.warn("report-service.amqp: recommendations.updated received null payload");
                return;
            }
            String sessionIdStr = root.path("session_id").asText(null);
            if (sessionIdStr == null || sessionIdStr.isBlank()) {
                log.warn("report-service.amqp: recommendations.updated received without session_id: {}", root);
                return;
            }

            UUID sessionId = UUID.fromString(sessionIdStr);
            log.info("report-service.amqp: recommendations.updated received for session={}", sessionId);
            notificationService.sendRecommendationsReady(sessionId);

        } catch (Exception e) {
            log.error("report-service.amqp: error handling recommendations.updated message: {}", e.getMessage(), e);
        }
    }


    private Double getDoubleOrNull(JsonNode node, String fieldName) {
        if (node != null && node.hasNonNull(fieldName)) {
            return node.get(fieldName).asDouble();
        }
        return null;
    }

    private List<String> getStringList(JsonNode node, String fieldName) {
        List<String> list = new ArrayList<>();
        if (node != null && node.has(fieldName) && node.get(fieldName).isArray()) {
            for (JsonNode item : node.get(fieldName)) {
                list.add(item.asText());
            }
        }
        return list;
    }
}
