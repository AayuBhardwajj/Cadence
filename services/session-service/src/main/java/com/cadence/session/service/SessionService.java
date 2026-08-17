package com.cadence.session.service;

import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.dto.StartSessionResponse;
import com.cadence.session.entity.AssessmentSession;
import com.cadence.session.entity.LegacyAssessment;
import com.cadence.session.repository.AssessmentSessionRepository;
import com.cadence.session.repository.LegacyAssessmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private final EligibilityService eligibilityService;
    private final LegacyAssessmentRepository legacyAssessmentRepository;
    private final AssessmentSessionRepository assessmentSessionRepository;

    /**
     * Intentionally NOT @Transactional: each save() must commit independently so the
     * assessments hard-fail and assessment_sessions soft-fail are isolated transactions,
     * not one atomic unit. If @Transactional were added here, a failure during the second
     * save() would mark the transaction rollback-only and undo the legacy assessments insert,
     * destroying the intended D6 dual-write contract. See DECISIONS.md D6 addendum.
     */
    public StartSessionResponse createSession(UUID userId) {
        EligibilityResponse eligibility = eligibilityService.getEligibility(userId);
        if (eligibility == null || !eligibility.canAssess()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Assessment not available yet.");
        }

        UUID newSessionId = UUID.randomUUID();

        // 1. Primary write to legacy assessments table (hard-fail if this fails)
        try {
            LegacyAssessment legacyAssessment = LegacyAssessment.builder()
                    .id(newSessionId)
                    .userId(userId)
                    .build();
            legacyAssessmentRepository.save(legacyAssessment);
        } catch (Exception insertErr) {
            log.error("Failed to insert legacy assessment row for session {}", newSessionId, insertErr);
            throw new RuntimeException("Failed to insert legacy assessment: " + insertErr.getMessage(), insertErr);
        }

        // 2. Dual-write to assessment_sessions table (soft-fail if this fails)
        List<String> persistenceWarnings = new ArrayList<>();
        try {
            AssessmentSession assessmentSession = AssessmentSession.builder()
                    .id(newSessionId)
                    .userId(userId)
                    .status("pending")
                    .createdAt(OffsetDateTime.now())
                    .startedAt(OffsetDateTime.now())
                    .build();
            assessmentSessionRepository.save(assessmentSession);
        } catch (Exception err) {
            log.error("dual-write: assessment_sessions insert failed for session {} — continuing", newSessionId, err);
            persistenceWarnings.add("Failed to create assessment_sessions row: " + err.getClass().getSimpleName());
        }

        return StartSessionResponse.builder()
                .status("success")
                .sessionId(newSessionId)
                .persistenceWarnings(persistenceWarnings)
                .build();
    }
}
