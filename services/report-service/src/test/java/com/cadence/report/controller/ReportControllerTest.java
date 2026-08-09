package com.cadence.report.controller;

import com.cadence.report.config.SecurityConfig;
import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.service.ReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReportController.class)
@Import(SecurityConfig.class)
class ReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReportService reportService;

    @Test
    void whenReportExists_returns200AndReportJson() throws Exception {
        UUID reportId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();

        AssessmentReportResponse response = new AssessmentReportResponse(
                reportId,
                sessionId,
                "Sample speech transcript",
                82,
                80,
                84,
                81,
                85,
                83,
                80,
                "B2",
                140,
                3,
                0,
                List.of("Clear tone", "Strong vocabulary"),
                List.of("Pacing stability"),
                "Great progress overall.",
                null,
                OffsetDateTime.now()
        );

        when(reportService.getReportBySessionId(eq(sessionId)))
                .thenReturn(Optional.of(response));

        mockMvc.perform(get("/api/assessment/results/{sessionId}", sessionId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reportId.toString()))
                .andExpect(jsonPath("$.assessment_session_id").value(sessionId.toString()))
                .andExpect(jsonPath("$.overall_score").value(82))
                .andExpect(jsonPath("$.cefr_level").value("B2"))
                .andExpect(jsonPath("$.strengths[0]").value("Clear tone"))
                .andExpect(jsonPath("$.weak_areas").isEmpty());
    }

    @Test
    void whenReportMissing_returns404() throws Exception {
        UUID missingSessionId = UUID.randomUUID();

        when(reportService.getReportBySessionId(eq(missingSessionId)))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/assessment/results/{sessionId}", missingSessionId.toString()))
                .andExpect(status().isNotFound());
    }
}
