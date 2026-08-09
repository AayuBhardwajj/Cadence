package com.cadence.session.service;

import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class EligibilityServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @InjectMocks
    private EligibilityService eligibilityService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    // ── Active stub test (D7) ─────────────────────────────────────────────────

    /**
     * DECISIONS.md D7 (2026-08-09): eligibility is always granted — no cooldown.
     * Asserts the stub response shape matches the monolith's get_eligibility() sentinel values.
     */
    @Test
    void getEligibility_alwaysReturnsStubResponse() {
        EligibilityResponse response = eligibilityService.getEligibility(userId);

        assertTrue(response.canAssess(), "D7 stub must always return can_assess=true");
        assertNull(response.nextAvailableAt(), "D7 stub must return next_available_at=null");
        assertEquals(999, response.assessmentsRemaining(),
                "D7 stub must return assessments_remaining=999, matching monolith sentinel");
    }

    // ── Cooldown tests — DISABLED per DECISIONS.md D7 (2026-08-09) ───────────
    // These tests verified the real 24-hour cooldown logic. They are preserved
    // intact (not deleted) so they can be re-enabled alongside the real cooldown
    // implementation if D7 is reopened. Do not delete them without a new decision entry.

    @Test
    @Disabled("DECISIONS.md D7 (2026-08-09): cooldown disabled — re-enable if D7 is reopened")
    void whenUserHasNoPriorAssessment_isEligible() {
        // Original test body preserved for future re-enable:
        // when(userProfileRepository.checkEligibility(userId)).thenReturn(null);
        // when(userProfileRepository.findById(userId)).thenReturn(
        //     Optional.of(UserProfile.builder().id(userId).lastFullAssessmentAt(null).build()));
        //
        // EligibilityResponse response = eligibilityService.getEligibility(userId);
        //
        // assertTrue(response.canAssess());
        // assertNull(response.nextAvailableAt());
        // assertEquals(1, response.assessmentsRemaining());
    }

    @Test
    @Disabled("DECISIONS.md D7 (2026-08-09): cooldown disabled — re-enable if D7 is reopened")
    void whenUserAssessedWithin24Hours_isOnCooldown() {
        // Original test body preserved for future re-enable:
        // when(userProfileRepository.checkEligibility(userId)).thenReturn(null);
        // OffsetDateTime recentAssessment = OffsetDateTime.now().minusHours(2);
        // when(userProfileRepository.findById(userId)).thenReturn(
        //     Optional.of(UserProfile.builder().id(userId).lastFullAssessmentAt(recentAssessment).build()));
        //
        // EligibilityResponse response = eligibilityService.getEligibility(userId);
        //
        // assertFalse(response.canAssess());
        // assertNotNull(response.nextAvailableAt());
        // assertEquals(0, response.assessmentsRemaining());
    }

    @Test
    @Disabled("DECISIONS.md D7 (2026-08-09): cooldown disabled — re-enable if D7 is reopened")
    void whenUserAssessedMoreThan24HoursAgo_isEligible() {
        // Original test body preserved for future re-enable:
        // when(userProfileRepository.checkEligibility(userId)).thenReturn(null);
        // OffsetDateTime oldAssessment = OffsetDateTime.now().minusHours(25);
        // when(userProfileRepository.findById(userId)).thenReturn(
        //     Optional.of(UserProfile.builder().id(userId).lastFullAssessmentAt(oldAssessment).build()));
        //
        // EligibilityResponse response = eligibilityService.getEligibility(userId);
        //
        // assertTrue(response.canAssess());
        // assertNull(response.nextAvailableAt());
        // assertEquals(1, response.assessmentsRemaining());
    }
}
