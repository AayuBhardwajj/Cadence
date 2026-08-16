package com.cadence.content.controller;

import com.cadence.content.dto.TipResponse;
import com.cadence.content.service.TipService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@Slf4j
public class TipController {

    private final TipService tipService;

    public TipController(TipService tipService) {
        this.tipService = tipService;
    }

    @GetMapping("/tip-of-the-day")
    public ResponseEntity<TipResponse> getTipOfTheDay(@RequestParam("user_id") String userId) {
        try {
            TipResponse response = tipService.getTipOfTheDay(userId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, e.getMessage());
        } catch (Exception e) {
            log.error("Tip generation failed for user {}: {}", userId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate tip. Please try again later.");
        }
    }
}
