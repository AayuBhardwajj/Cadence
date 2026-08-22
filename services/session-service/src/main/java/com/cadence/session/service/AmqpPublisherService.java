package com.cadence.session.service;

import com.cadence.session.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Publishes AMQP messages to RabbitMQ queues for Phase 3 Stage 1 (D-impl-1, 2026-08-21).
 *
 * Publish failure handling (D-impl-2 sign-off):
 *   All publish calls are SYNCHRONOUS and SOFT-FAIL — consistent with the D6 dual-write pattern.
 *   A publish failure throws an AmqpPublishException which the caller (SessionService) catches,
 *   logs, and adds to persistence_warnings without blocking the HTTP response.
 *   This means a failed publish leaves assessment_sessions.status = 'uploading' with no
 *   analysis.requested event ever published — the session is stuck.
 *
 * Stuck-session detection (D-impl-2 explicit statement):
 *   Today, a stuck-in-uploading session is detectable ONLY via a manual Postgres query:
 *     SELECT id, status, audio_storage_path, created_at FROM assessment_sessions
 *     WHERE status = 'uploading' AND created_at < NOW() - INTERVAL '10 minutes';
 *   There is NO automated watchdog, no DLQ retry, and no alerting for this state today.
 *   The persistence_warning in the HTTP response is the only in-band signal to the caller.
 *   A future watchdog/retry mechanism is a tracked gap — see BUGS_AND_ISSUES.md.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AmqpPublisherService {

    private final RabbitTemplate rabbitTemplate;

    /**
     * Publishes an analysis.requested event to the direct queue.
     *
     * Payload contract (D15 / D-impl-2):
     *   - session_id:          UUID of the assessment session
     *   - user_id:             UUID of the candidate
     *   - audio_storage_path:  Supabase Storage path (NOT the signed URL — durability rationale in D16/item 5)
     *
     * Publish is synchronous — blocks until the broker acknowledges receipt.
     * Throws RuntimeException on failure; caller must soft-fail per D-impl-2.
     */
    public void publishAnalysisRequested(UUID sessionId, UUID userId, String audioStoragePath) {
        Map<String, Object> payload = Map.of(
                "session_id", sessionId.toString(),
                "user_id", userId.toString(),
                "audio_storage_path", audioStoragePath
        );

        log.info("Publishing analysis.requested: session={} user={} path={}", sessionId, userId, audioStoragePath);

        // RabbitTemplate.convertAndSend with Jackson2JsonMessageConverter serialises payload as JSON.
        // The default exchange with routing_key=queueName routes directly to the named queue.
        rabbitTemplate.convertAndSend(
                "",                                          // default exchange
                RabbitMQConfig.QUEUE_ANALYSIS_REQUESTED,     // routing key = queue name (direct)
                payload
        );

        log.info("analysis.requested published successfully for session={}", sessionId);
    }
}
