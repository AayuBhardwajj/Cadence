package com.cadence.auth.controller;

import com.cadence.auth.messaging.PingPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/poc")
public class PocController {

    private final PingPublisher pingPublisher;

    @Autowired
    public PocController(PingPublisher pingPublisher) {
        this.pingPublisher = pingPublisher;
    }

    @GetMapping("/ping")
    public ResponseEntity<Map<String, String>> ping(@RequestParam(value = "message", defaultValue = "hello") String message) {
        pingPublisher.sendPing(message);
        Map<String, String> response = new HashMap<>();
        response.put("status", "sent");
        response.put("message", message);
        return ResponseEntity.ok(response);
    }
}
