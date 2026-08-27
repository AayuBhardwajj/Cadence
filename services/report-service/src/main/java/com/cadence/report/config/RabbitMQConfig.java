package com.cadence.report.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ queue declarations and message conversion for report-service (Phase 3 Stage 4).
 *
 * Inbound Queues:
 *   - report-service.analysis.completed: bound to analysis.completed fanout exchange (declared in Stage 2).
 *   - recommendations.updated: direct queue published by ml-recommendation (declared in Stage 3).
 *
 * Both queues are DURABLE=true, EXCLUSIVE=false, AUTO_DELETE=false.
 * These declarations are idempotent in RabbitMQ.
 */
@Configuration
public class RabbitMQConfig {

    public static final String QUEUE_ANALYSIS_COMPLETED = "report-service.analysis.completed";
    public static final String QUEUE_RECOMMENDATIONS_UPDATED = "recommendations.updated";

    @Bean
    public Queue reportAnalysisCompletedQueue() {
        return new Queue(QUEUE_ANALYSIS_COMPLETED, /* durable= */ true, /* exclusive= */ false, /* autoDelete= */ false);
    }

    @Bean
    public Queue recommendationsUpdatedQueue() {
        return new Queue(QUEUE_RECOMMENDATIONS_UPDATED, /* durable= */ true, /* exclusive= */ false, /* autoDelete= */ false);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
