package com.cadence.session.controller;

import com.cadence.session.config.SecurityConfig;
import com.cadence.session.dto.StartSessionResponse;
import com.cadence.session.service.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SessionController.class)
@Import(SecurityConfig.class)
class SessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionService sessionService;

    @Test
    void whenUserIdMissing_returns401() throws Exception {
        mockMvc.perform(post("/api/assessment/start"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid or missing user identity."));
    }

    @Test
    void whenUserIdInvalidShort_returns401() throws Exception {
        mockMvc.perform(post("/api/assessment/start").param("user_id", "short"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid or missing user identity."));
    }

    @Test
    void whenUserIdInvalidUuid_returns401() throws Exception {
        mockMvc.perform(post("/api/assessment/start").param("user_id", "invalid-uuid-string-12345"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid or missing user identity."));
    }

    @Test
    void whenStartAssessmentSuccess_returns200AndSessionId() throws Exception {
        UUID validUuid = UUID.randomUUID();
        UUID generatedSessionId = UUID.randomUUID();
        StartSessionResponse mockResponse = StartSessionResponse.builder()
                .status("success")
                .sessionId(generatedSessionId)
                .persistenceWarnings(Collections.emptyList())
                .build();

        when(sessionService.createSession(any(UUID.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/assessment/start").param("user_id", validUuid.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.sessionId").value(generatedSessionId.toString()))
                .andExpect(jsonPath("$.persistence_warnings").isEmpty());
    }

    @Test
    void whenAssessmentsInsertFails_returns500() throws Exception {
        UUID validUuid = UUID.randomUUID();
        when(sessionService.createSession(any(UUID.class)))
                .thenThrow(new RuntimeException("Failed to insert legacy assessment"));

        mockMvc.perform(post("/api/assessment/start").param("user_id", validUuid.toString()))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void whenAssessmentSessionsInsertFails_returns200WithPersistenceWarnings() throws Exception {
        UUID validUuid = UUID.randomUUID();
        UUID generatedSessionId = UUID.randomUUID();
        StartSessionResponse mockResponse = StartSessionResponse.builder()
                .status("success")
                .sessionId(generatedSessionId)
                .persistenceWarnings(List.of("Failed to create assessment_sessions row: RuntimeException"))
                .build();

        when(sessionService.createSession(any(UUID.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/assessment/start").param("user_id", validUuid.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.sessionId").value(generatedSessionId.toString()))
                .andExpect(jsonPath("$.persistence_warnings[0]").value("Failed to create assessment_sessions row: RuntimeException"));
    }

    @Test
    void whenIneligible_returns403() throws Exception {
        UUID validUuid = UUID.randomUUID();
        when(sessionService.createSession(any(UUID.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Assessment not available yet."));

        mockMvc.perform(post("/api/assessment/start").param("user_id", validUuid.toString()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Assessment not available yet."));
    }

    @Test
    void whenUploadAssessmentSuccess_returns200() throws Exception {
        UUID validUserId = UUID.randomUUID();
        UUID validSessionId = UUID.randomUUID();
        com.cadence.session.dto.UploadAssessmentResponse mockResponse = com.cadence.session.dto.UploadAssessmentResponse.builder()
                .status("success")
                .sessionId(validSessionId)
                .storagePath(validUserId + "/" + validSessionId + ".webm")
                .signedUrl("https://supabase.co/storage/v1/object/sign/assessment-recordings/test.webm?token=123")
                .bucket("assessment-recordings")
                .persistenceWarnings(Collections.emptyList())
                .build();

        when(sessionService.uploadAssessment(any(), any(), any(), any(), any())).thenReturn(mockResponse);

        org.springframework.mock.web.MockMultipartFile mockFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "recording.webm", "audio/webm", "test audio".getBytes()
        );

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/assessment/upload")
                        .file(mockFile)
                        .param("userId", validUserId.toString())
                        .param("sessionId", validSessionId.toString())
                        .param("topicId", "workplace")
                        .param("duration", "45"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.sessionId").value(validSessionId.toString()))
                .andExpect(jsonPath("$.storagePath").value(validUserId + "/" + validSessionId + ".webm"))
                .andExpect(jsonPath("$.bucket").value("assessment-recordings"));
    }
}
