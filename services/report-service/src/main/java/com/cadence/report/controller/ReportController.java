package com.cadence.report.controller;

import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.dto.CreateAssessmentReportRequest;
import com.cadence.report.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping("/api/assessment/reports")
    public ResponseEntity<AssessmentReportResponse> createReport(@Valid @RequestBody CreateAssessmentReportRequest request) {
        AssessmentReportResponse response = reportService.createReport(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

