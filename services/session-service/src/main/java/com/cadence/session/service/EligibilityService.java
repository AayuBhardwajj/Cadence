package com.cadence.session.service;

import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EligibilityService {

    private final UserProfileRepository userProfileRepository;

    /**
     * Returns a stub-equivalent eligibility response: always eligible, no cooldown.
     *
     * DECISIONS.md D7 (locked 2026-08-09): Do NOT call the real check_assessment_eligibility()
     * SQL function or apply the 24-hour cooldown. Traffic is too low to size a cap responsibly,
     * and the refill worker — not user-facing assessments — is the dominant Groq quota consumer.
     * Re-open D7 before changing this method.
     *
     * The real cooldown implementation (RPC path and 24-hour Java fallback) is preserved below,
     * commented out, so it can be re-enabled without rewriting from scratch if D7 is reopened.
     */
    public EligibilityResponse getEligibility(UUID userId) {
        // D7 (2026-08-09): stub — always eligible, matching monolith backend/main.py behavior.
        // assessments_remaining=999 matches the monolith sentinel value.
        return new EligibilityResponse(true, null, 999);

        /*
         * ── DISABLED per DECISIONS.md D7 (2026-08-09) ────────────────────────────
         * Re-enable the block below (and restore the UserProfile/OffsetDateTime/Optional
         * imports) if D7 is reopened and a real per-user cooldown is re-introduced.
         *
         * Path A: call the real check_assessment_eligibility() Postgres function via RPC.
         *
         * try {
         *     UserProfileRepository.EligibilityProjection projection =
         *         userProfileRepository.checkEligibility(userId);
         *     if (projection != null && projection.getCanAssess() != null) {
         *         return new EligibilityResponse(
         *             projection.getCanAssess(),
         *             projection.getNextAvailableAt(),
         *             projection.getAssessmentsRemaining() != null
         *                 ? projection.getAssessmentsRemaining() : 0
         *         );
         *     }
         * } catch (Exception ignored) {
         *     // Fallback if RPC native query fails or is unmapped in non-DB unit test context
         * }
         *
         * Path B: 24-hour Java fallback using profiles.last_full_assessment_at.
         *
         * Optional<UserProfile> profileOpt = userProfileRepository.findById(userId);
         * if (profileOpt.isEmpty() || profileOpt.get().getLastFullAssessmentAt() == null) {
         *     return new EligibilityResponse(true, null, 1);
         * }
         *
         * OffsetDateTime lastAssessment = profileOpt.get().getLastFullAssessmentAt();
         * OffsetDateTime nextAvailable = lastAssessment.plusHours(24);
         * boolean canAssess = OffsetDateTime.now().isAfter(nextAvailable);
         *
         * return new EligibilityResponse(
         *     canAssess,
         *     canAssess ? null : nextAvailable,
         *     canAssess ? 1 : 0
         * );
         * ── END DISABLED BLOCK ────────────────────────────────────────────────────
         */
    }
}
