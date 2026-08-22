package com.cadence.session.service;

import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.dto.StartSessionResponse;
import com.cadence.session.entity.AssessmentSession;
import com.cadence.session.entity.LegacyAssessment;
import com.cadence.session.repository.AssessmentSessionRepository;
import com.cadence.session.repository.LegacyAssessmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private EligibilityService eligibilityService;

    @Mock
    private LegacyAssessmentRepository legacyAssessmentRepository;

    @Mock
    private AssessmentSessionRepository assessmentSessionRepository;

    @Mock
    private SupabaseStorageService supabaseStorageService;

    @Mock
    private AmqpPublisherService amqpPublisherService;

    @InjectMocks
    private SessionService sessionService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    @Test
    void createSession_successfulDualInsert() {
        when(eligibilityService.getEligibility(userId))
                .thenReturn(new EligibilityResponse(true, null, 999));
        when(legacyAssessmentRepository.save(any(LegacyAssessment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(assessmentSessionRepository.save(any(AssessmentSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StartSessionResponse response = sessionService.createSession(userId);

        assertNotNull(response);
        assertEquals("success", response.getStatus());
        assertNotNull(response.getSessionId());
        assertTrue(response.getPersistenceWarnings().isEmpty(), "Expected no persistence warnings on clean insert");

        verify(legacyAssessmentRepository, times(1)).save(any(LegacyAssessment.class));
        verify(assessmentSessionRepository, times(1)).save(any(AssessmentSession.class));
    }

    @Test
    void createSession_assessmentsInsertFailure_throwsException() {
        when(eligibilityService.getEligibility(userId))
                .thenReturn(new EligibilityResponse(true, null, 999));
        when(legacyAssessmentRepository.save(any(LegacyAssessment.class)))
                .thenThrow(new RuntimeException("Database error on assessments table"));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> sessionService.createSession(userId));
        assertTrue(exception.getMessage().contains("Failed to insert legacy assessment"));

        verify(legacyAssessmentRepository, times(1)).save(any(LegacyAssessment.class));
        verify(assessmentSessionRepository, never()).save(any(AssessmentSession.class));
    }

    @Test
    void createSession_assessmentSessionsInsertFailure_returnsSuccessWithWarnings() {
        when(eligibilityService.getEligibility(userId))
                .thenReturn(new EligibilityResponse(true, null, 999));
        when(legacyAssessmentRepository.save(any(LegacyAssessment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(assessmentSessionRepository.save(any(AssessmentSession.class)))
                .thenThrow(new RuntimeException("Dual write error on assessment_sessions table"));

        StartSessionResponse response = sessionService.createSession(userId);

        assertNotNull(response);
        assertEquals("success", response.getStatus());
        assertNotNull(response.getSessionId());
        assertEquals(1, response.getPersistenceWarnings().size());
        assertEquals("Failed to create assessment_sessions row: RuntimeException", response.getPersistenceWarnings().get(0));

        verify(legacyAssessmentRepository, times(1)).save(any(LegacyAssessment.class));
        verify(assessmentSessionRepository, times(1)).save(any(AssessmentSession.class));
    }

    @Test
    void createSession_whenIneligible_throwsForbiddenStatusException() {
        when(eligibilityService.getEligibility(userId))
                .thenReturn(new EligibilityResponse(false, null, 0));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> sessionService.createSession(userId));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Assessment not available yet."));

        verify(legacyAssessmentRepository, never()).save(any(LegacyAssessment.class));
        verify(assessmentSessionRepository, never()).save(any(AssessmentSession.class));
    }

    @Test
    void uploadAssessment_successfulUploadAndPersistence() {
        UUID sessionId = UUID.randomUUID();
        org.springframework.mock.web.MockMultipartFile mockFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "speech.webm", "audio/webm", "test audio content".getBytes()
        );

        when(supabaseStorageService.uploadFile(anyString(), any(byte[].class), anyString()))
                .thenReturn(userId + "/" + sessionId + ".webm");
        when(supabaseStorageService.createSignedUrl(anyString(), eq(3600)))
                .thenReturn("https://supabase.co/storage/v1/object/sign/assessment-recordings/" + userId + "/" + sessionId + ".webm?token=123");

        AssessmentSession existingSession = AssessmentSession.builder()
                .id(sessionId)
                .userId(userId)
                .status("pending")
                .build();
        when(assessmentSessionRepository.findById(sessionId)).thenReturn(java.util.Optional.of(existingSession));
        when(assessmentSessionRepository.save(any(AssessmentSession.class))).thenAnswer(i -> i.getArgument(0));

        var response = sessionService.uploadAssessment(userId, sessionId, "custom", 60, mockFile);

        assertNotNull(response);
        assertEquals("success", response.getStatus());
        assertEquals(sessionId, response.getSessionId());
        assertEquals(userId + "/" + sessionId + ".webm", response.getStoragePath());
        assertTrue(response.getSignedUrl().contains("token=123"));
        assertEquals("assessment-recordings", response.getBucket());

        verify(assessmentSessionRepository, times(1)).save(argThat(s ->
                "uploading".equals(s.getStatus()) && (userId + "/" + sessionId + ".webm").equals(s.getAudioStoragePath())
        ));
    }

    @Test
    void uploadAssessment_emptyFile_throwsBadRequest() {
        UUID sessionId = UUID.randomUUID();
        org.springframework.mock.web.MockMultipartFile emptyFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "empty.webm", "audio/webm", new byte[0]
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                sessionService.uploadAssessment(userId, sessionId, "custom", 60, emptyFile)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void uploadAssessment_amqpPublishFails_returnSuccessWithWarning() {
        // D-impl-2: AMQP publish failure is soft-fail — response is still success with persistence_warnings
        UUID sessionId = UUID.randomUUID();
        org.springframework.mock.web.MockMultipartFile mockFile = new org.springframework.mock.web.MockMultipartFile(
                "file", "speech.webm", "audio/webm", "test audio content".getBytes()
        );

        when(supabaseStorageService.uploadFile(anyString(), any(byte[].class), anyString()))
                .thenReturn(userId + "/" + sessionId + ".webm");
        when(supabaseStorageService.createSignedUrl(anyString(), eq(3600)))
                .thenReturn("https://supabase.co/signed-url");
        when(assessmentSessionRepository.findById(sessionId)).thenReturn(java.util.Optional.empty());
        when(assessmentSessionRepository.save(any(AssessmentSession.class))).thenAnswer(i -> i.getArgument(0));

        doThrow(new RuntimeException("RabbitMQ connection refused"))
                .when(amqpPublisherService).publishAnalysisRequested(any(UUID.class), any(UUID.class), anyString());

        var response = sessionService.uploadAssessment(userId, sessionId, "custom", 60, mockFile);

        assertEquals("success", response.getStatus());
        assertEquals(1, response.getPersistenceWarnings().size());
        assertTrue(response.getPersistenceWarnings().get(0).contains("Failed to publish analysis.requested"),
                "Expected AMQP failure in persistence_warnings");

        // Storage write must have still happened despite AMQP failure
        verify(supabaseStorageService, times(1)).uploadFile(anyString(), any(byte[].class), anyString());
    }
}
