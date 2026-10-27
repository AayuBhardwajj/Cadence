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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * AMQP Consumer for report-service (Phase 3 Stage 4).
 *
 * Inbound Handlers:
 * 1. analysis.completed:
 * - Persists AssessmentReport.
 * - Updates assessment_sessions to completed.
 * - Broadcasts REPORT_READY only after the transaction commits.
 * - On failure, records failure status and broadcasts ASSESSMENT_FAILED.
 *
 * 2. recommendations.updated:
 * - Broadcasts RECOMMENDATIONS_READY without a database write.
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
                throw new IllegalArgumentException(
                        "Received empty or null analysis.completed payload");
            }

            String sessionIdStr = root.path("session_id").asText(null);

            if (sessionIdStr == null || sessionIdStr.isBlank()) {
                throw new IllegalArgumentException(
                        "Missing required field 'session_id' in analysis.completed payload");
            }

            sessionId = UUID.fromString(sessionIdStr);

            JsonNode audioData = root.path("audio_data");
            JsonNode scoreData = root.path("score_data");
            JsonNode breakdown = scoreData.path("breakdown");

            CreateAssessmentReportRequest request = CreateAssessmentReportRequest.builder()
                    .assessmentSessionId(sessionId)
                    .transcription(
                            audioData.path("transcription").asText(""))
                    .referencePassageText(
                            root.path("reference_passage").asText(null))
                    .overallScore(
                            getDoubleOrNull(scoreData, "overall_score"))
                    .pronunciationScore(
                            getDoubleOrNull(breakdown, "pronunciation"))
                    .fluencyScore(
                            getDoubleOrNull(breakdown, "fluency"))
                    .clarityScore(
                            getDoubleOrNull(breakdown, "clarity"))
                    .grammarScore(
                            getDoubleOrNull(breakdown, "grammar"))
                    .vocabularyScore(
                            getDoubleOrNull(breakdown, "vocabulary"))
                    .confidenceScore(
                            getDoubleOrNull(breakdown, "confidence"))
                    .cefrLevel(
                            scoreData.path("cefr_level").asText(null))
                    .wpm(
                            getDoubleOrNull(
                                    audioData.has("wpm")
                                            ? audioData
                                            : breakdown,
                                    "wpm"))
                    .fillerWordCount(
                            getDoubleOrNull(
                                    audioData.has("filler_count")
                                            ? audioData
                                            : breakdown,
                                    audioData.has("filler_count")
                                            ? "filler_count"
                                            : "fillers"))
                    .eyeContactScore(
                            getDoubleOrNull(breakdown, "eye_contact"))
                    .strengths(
                            getStringList(scoreData, "strengths"))
                    .focusAreas(
                            getStringList(scoreData, "focus_areas"))
                    .feedback(
                            scoreData.path("feedback").asText(null))
                    .amcatMetrics(
                            getJsonNodeOrNull(scoreData, "amcat_metrics"))
                    .amcatInsights(
                            getJsonNodeOrNull(scoreData, "amcat_insights"))
                    .amcatErrorLog(
                            getJsonNodeOrNull(scoreData, "amcat_error_log"))
                    .amcatSentences(
                            getJsonNodeOrNull(scoreData, "amcat_sentences"))
                    .amcatMtiDeepDive(
                            getJsonNodeOrNull(scoreData, "amcat_mti_deep_dive"))
                    .amcatSummary(
                            getJsonNodeOrNull(scoreData, "amcat_summary"))
                    .improvementPlan(
                            getJsonNodeOrNull(scoreData, "improvement_plan"))
                    .practiceExercises(
                            getJsonNodeOrNull(scoreData, "practice_exercises"))
                    .grammarErrors(
                            getJsonNodeOrNull(scoreData, "grammar_errors"))
                    .nextTopicSuggestion(
                            scoreData.hasNonNull("next_topic_suggestion")
                                    ? scoreData.path(
                                            "next_topic_suggestion").asText(null)
                                    : null)
                    .build();

            log.info(
                    "report-service.amqp: processing analysis.completed for session={}",
                    sessionId);

            AssessmentReportResponse reportResponse = reportService.createReport(request);

            // Update assessment_sessions lifecycle state to completed.
            AssessmentSession session = sessionRepository.findById(sessionId)
                    .orElseGet(() -> AssessmentSession.builder()
                            .id(request.getAssessmentSessionId())
                            .build());

            session.setStatus("completed");
            session.setCompletedAt(OffsetDateTime.now());
            session.setFailureReason(null);
            sessionRepository.save(session);

            log.info(
                    "report-service.amqp: session {} updated status=completed completed_at={}",
                    sessionId,
                    session.getCompletedAt());

            // Capture immutable IDs for use after the transaction commits.
            final UUID completedSessionId = sessionId;
            final UUID completedReportId = reportResponse.id();

            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(
                        new TransactionSynchronization() {
                            @Override
                            public void afterCommit() {
                                log.info(
                                        "Database transaction committed; broadcasting REPORT_READY for session={}, reportId={}",
                                        completedSessionId,
                                        completedReportId);

                                notificationService.sendReportReady(
                                        completedSessionId,
                                        completedReportId);
                            }
                        });
            } else {
                // Defensive fallback if transaction synchronization is unavailable.
                // This path should not normally be used with @Transactional.
                log.warn(
                        "Transaction synchronization is inactive; broadcasting REPORT_READY immediately for session={}",
                        completedSessionId);

                notificationService.sendReportReady(
                        completedSessionId,
                        completedReportId);
            }

        } catch (Exception e) {
            log.error(
                    "report-service.amqp: unhandled failure processing analysis.completed for session={}: {}",
                    sessionId,
                    e.getMessage(),
                    e);

            if (sessionId != null) {
                final UUID failedSessionId = sessionId;

                try {
                    AssessmentSession session = sessionRepository.findById(failedSessionId)
                            .orElseGet(() -> AssessmentSession.builder()
                                    .id(failedSessionId)
                                    .build());

                    session.setStatus("failed");
                    session.setFailureReason(e.getMessage());
                    sessionRepository.save(session);

                } catch (Exception dbErr) {
                    log.error(
                            "report-service.amqp: failed to record status=failed for session {}: {}",
                            failedSessionId,
                            dbErr.getMessage(),
                            dbErr);
                }

                notificationService.sendAssessmentFailed(
                        failedSessionId,
                        e.getMessage());
            }

            throw new AmqpRejectAndDontRequeueException(
                    "Fatal error in analysis.completed consumer",
                    e);
        }
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_RECOMMENDATIONS_UPDATED)
    public void handleRecommendationsUpdated(JsonNode root) {
        try {
            if (root == null) {
                log.warn(
                        "report-service.amqp: recommendations.updated received null payload");
                return;
            }

            String sessionIdStr = root.path("session_id").asText(null);

            if (sessionIdStr == null || sessionIdStr.isBlank()) {
                log.warn(
                        "report-service.amqp: recommendations.updated received without session_id: {}",
                        root);
                return;
            }

            UUID sessionId = UUID.fromString(sessionIdStr);

            log.info(
                    "report-service.amqp: recommendations.updated received for session={}",
                    sessionId);

            notificationService.sendRecommendationsReady(sessionId);

        } catch (Exception e) {
            log.error(
                    "report-service.amqp: error handling recommendations.updated message: {}",
                    e.getMessage(),
                    e);
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

        if (node != null
                && node.has(fieldName)
                && node.get(fieldName).isArray()) {

            for (JsonNode item : node.get(fieldName)) {
                list.add(item.asText());
            }
        }

        return list;
    }

    private JsonNode getJsonNodeOrNull(JsonNode node, String fieldName) {
        if (node != null && node.hasNonNull(fieldName)) {
            return node.get(fieldName);
        }

        return null;
    }
}