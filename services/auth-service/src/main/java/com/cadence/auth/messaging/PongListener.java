package com.cadence.auth.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
public class PongListener {

    private static final Logger log = LoggerFactory.getLogger(PongListener.class);

    @RabbitListener(queues = "poc.pong")
    public void receivePong(String message) {
        log.info("[PONG RECEIVED] Received message: '{}' at {}", message, LocalDateTime.now());
    }
}
