package com.cadence.report.service;

import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.repository.AssessmentReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AssessmentReportRepository reportRepository;

    @Transactional(readOnly = true)
    public Optional<AssessmentReportResponse> getReportBySessionId(UUID sessionId) {
        return reportRepository.findByAssessmentSessionId(sessionId)
                .map(AssessmentReportResponse::fromEntity);
    }
}
