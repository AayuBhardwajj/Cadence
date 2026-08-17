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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private EligibilityService eligibilityService;

    @Mock
    private LegacyAssessmentRepository legacyAssessmentRepository;

    @Mock
    private AssessmentSessionRepository assessmentSessionRepository;

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
}
