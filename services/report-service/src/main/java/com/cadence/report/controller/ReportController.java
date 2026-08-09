package com.cadence.report.controller;

import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/api/assessment/results/{sessionId}")
    public ResponseEntity<AssessmentReportResponse> getReportBySessionId(@PathVariable("sessionId") String sessionIdStr) {
        UUID sessionId;
        try {
            sessionId = UUID.fromString(sessionIdStr.trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }

        return reportService.getReportBySessionId(sessionId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
