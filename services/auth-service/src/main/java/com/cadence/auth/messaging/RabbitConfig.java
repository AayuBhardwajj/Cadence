package com.cadence.auth.messaging;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    @Bean
    public Queue pingQueue() {
        return new Queue("poc.ping", true);
    }

    @Bean
    public Queue pongQueue() {
        return new Queue("poc.pong", true);
    }
}
