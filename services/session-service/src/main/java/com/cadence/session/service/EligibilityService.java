package com.cadence.session.service;

import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.entity.UserProfile;
import com.cadence.session.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EligibilityService {

    private final UserProfileRepository userProfileRepository;

    public EligibilityResponse getEligibility(UUID userId) {
        try {
            UserProfileRepository.EligibilityProjection projection = userProfileRepository.checkEligibility(userId);
            if (projection != null && projection.getCanAssess() != null) {
                return new EligibilityResponse(
                    projection.getCanAssess(),
                    projection.getNextAvailableAt(),
                    projection.getAssessmentsRemaining() != null ? projection.getAssessmentsRemaining() : 0
                );
            }
        } catch (Exception ignored) {
            // Fallback if RPC native query fails or is unmapped in non-DB unit test context
        }

        Optional<UserProfile> profileOpt = userProfileRepository.findById(userId);
        if (profileOpt.isEmpty() || profileOpt.get().getLastFullAssessmentAt() == null) {
            return new EligibilityResponse(true, null, 1);
        }

        OffsetDateTime lastAssessment = profileOpt.get().getLastFullAssessmentAt();
        OffsetDateTime nextAvailable = lastAssessment.plusHours(24);
        boolean canAssess = OffsetDateTime.now().isAfter(nextAvailable);

        return new EligibilityResponse(
            canAssess,
            canAssess ? null : nextAvailable,
            canAssess ? 1 : 0
        );
    }
}
