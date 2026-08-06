package com.cadence.session.service;

import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.entity.UserProfile;
import com.cadence.session.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

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

    @Test
    void whenUserHasNoPriorAssessment_isEligible() {
        when(userProfileRepository.checkEligibility(userId)).thenReturn(null);
        when(userProfileRepository.findById(userId)).thenReturn(Optional.of(UserProfile.builder().id(userId).lastFullAssessmentAt(null).build()));

        EligibilityResponse response = eligibilityService.getEligibility(userId);

        assertTrue(response.canAssess());
        assertNull(response.nextAvailableAt());
        assertEquals(1, response.assessmentsRemaining());
    }

    @Test
    void whenUserAssessedWithin24Hours_isOnCooldown() {
        when(userProfileRepository.checkEligibility(userId)).thenReturn(null);
        OffsetDateTime recentAssessment = OffsetDateTime.now().minusHours(2);
        when(userProfileRepository.findById(userId)).thenReturn(Optional.of(UserProfile.builder().id(userId).lastFullAssessmentAt(recentAssessment).build()));

        EligibilityResponse response = eligibilityService.getEligibility(userId);

        assertFalse(response.canAssess());
        assertNotNull(response.nextAvailableAt());
        assertEquals(0, response.assessmentsRemaining());
    }

    @Test
    void whenUserAssessedMoreThan24HoursAgo_isEligible() {
        when(userProfileRepository.checkEligibility(userId)).thenReturn(null);
        OffsetDateTime oldAssessment = OffsetDateTime.now().minusHours(25);
        when(userProfileRepository.findById(userId)).thenReturn(Optional.of(UserProfile.builder().id(userId).lastFullAssessmentAt(oldAssessment).build()));

        EligibilityResponse response = eligibilityService.getEligibility(userId);

        assertTrue(response.canAssess());
        assertNull(response.nextAvailableAt());
        assertEquals(1, response.assessmentsRemaining());
    }
}
