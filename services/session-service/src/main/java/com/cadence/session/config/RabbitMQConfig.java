package com.cadence.session.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ queue declarations for Phase 3 Stage 1 (D-impl-1, 2026-08-21).
 *
 * Queue contract (D15 / D-impl-1 sign-off):
 *   - analysis.requested:       publisher = session-service (here), consumer = ml-audio
 *   - analysis.audio.completed: publisher = ml-audio,            consumer = ml-analysis
 *
 * Both queues are DURABLE=true, EXCLUSIVE=false, AUTO_DELETE=false.
 * These exact params MUST match the consumer declarations in:
 *   services/ml-audio/main.py  (AmqpConsumer.declare_queues)
 * RabbitMQ allows idempotent re-declaration of queues with identical params (no 406 error).
 * A param mismatch between this file and ml-audio/main.py will produce PRECONDITION_FAILED
 * at consumer startup — change both files together.
 */
@Configuration
public class RabbitMQConfig {

    // Queue name constants — single source of truth on the Java side.
    // Mirror of QUEUE_ANALYSIS_REQUESTED / QUEUE_ANALYSIS_AUDIO_COMPLETED in ml-audio/main.py.
    public static final String QUEUE_ANALYSIS_REQUESTED = "analysis.requested";
    public static final String QUEUE_ANALYSIS_AUDIO_COMPLETED = "analysis.audio.completed";

    /**
     * Declares analysis.requested as a durable, non-exclusive, non-auto-delete queue.
     * Consumer: ml-audio (services/ml-audio/main.py AmqpConsumer).
     */
    @Bean
    public Queue analysisRequestedQueue() {
        return new Queue(QUEUE_ANALYSIS_REQUESTED, /* durable= */ true, /* exclusive= */ false, /* autoDelete= */ false);
    }

    /**
     * Declares analysis.audio.completed as a durable, non-exclusive, non-auto-delete queue.
     * Publisher: ml-audio. Declared here so session-service startup confirms queue topology is correct.
     */
    @Bean
    public Queue analysisAudioCompletedQueue() {
        return new Queue(QUEUE_ANALYSIS_AUDIO_COMPLETED, /* durable= */ true, /* exclusive= */ false, /* autoDelete= */ false);
    }

    /**
     * JSON message converter — serialises/deserialises message bodies as JSON.
     * Applied automatically by Spring AMQP to all RabbitTemplate send calls.
     */
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
