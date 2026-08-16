package com.cadence.content.controller;

import com.cadence.content.dto.GeneratePassageRequest;
import com.cadence.content.service.PassageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/passages")
@Slf4j
public class PassageController {

    private final PassageService passageService;

    public PassageController(PassageService passageService) {
        this.passageService = passageService;
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generatePassage(@RequestBody GeneratePassageRequest request) {
        try {
            Map<String, Object> result = passageService.getOrGeneratePassage(
                    request.getTopic(),
                    request.getDifficulty(),
                    request.getIssueType(),
                    request.getWordCount(),
                    request.getResolvedSessionId()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to generate passage: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
