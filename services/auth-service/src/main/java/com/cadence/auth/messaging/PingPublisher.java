package com.cadence.auth.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class PingPublisher {

    private static final Logger log = LoggerFactory.getLogger(PingPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Autowired
    public PingPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void sendPing(String message) {
        log.info("[PING SENT] Sending message: '{}' at {}", message, LocalDateTime.now());
        rabbitTemplate.convertAndSend("poc.ping", message);
    }
}
