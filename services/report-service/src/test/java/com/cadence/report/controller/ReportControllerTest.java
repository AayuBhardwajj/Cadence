package com.cadence.report.controller;

import com.cadence.report.config.SecurityConfig;
import com.cadence.report.dto.AssessmentReportResponse;
import com.cadence.report.service.ReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
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

    @Test
    void whenCreateReportValid_returns201CreatedAndReportJson() throws Exception {
        UUID reportId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        AssessmentReportResponse response = new AssessmentReportResponse(
                reportId,
                sessionId,
                "Sample speech transcript",
                85, 80, 88, 82, 90, 85, 87,
                "B2", 135, 2, 0,
                List.of("Good pacing"), List.of("Reduce fillers"),
                "Great progress", null,
                null, null, null, null, null, null, null, null, null, null, now
        );

        when(reportService.createReport(any())).thenReturn(response);

        String jsonPayload = """
                {
                    "assessmentSessionId": "%s",
                    "transcription": "Sample speech transcript",
                    "overallScore": 85,
                    "pronunciationScore": 80,
                    "fluencyScore": 88,
                    "clarityScore": 82,
                    "grammarScore": 90,
                    "vocabularyScore": 85,
                    "confidenceScore": 87,
                    "cefrLevel": "B2",
                    "wpm": 135,
                    "fillerWordCount": 2,
                    "eyeContactScore": 0,
                    "strengths": ["Good pacing"],
                    "focusAreas": ["Reduce fillers"],
                    "feedback": "Great progress"
                }
                """.formatted(sessionId);

        mockMvc.perform(post("/api/assessment/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(reportId.toString()))
                .andExpect(jsonPath("$.assessment_session_id").value(sessionId.toString()))
                .andExpect(jsonPath("$.overall_score").value(85))
                .andExpect(jsonPath("$.created_at").exists());
    }

    @Test
    void whenCreateReportMissingAssessmentSessionId_returns400() throws Exception {
        String invalidJsonPayload = """
                {
                    "transcription": "Sample speech transcript",
                    "overallScore": 85
                }
                """;

        mockMvc.perform(post("/api/assessment/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJsonPayload))
                .andExpect(status().isBadRequest());
    }
}

