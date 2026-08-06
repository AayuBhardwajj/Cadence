package com.cadence.session.repository;

import com.cadence.session.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.UUID;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {

    interface EligibilityProjection {
        Boolean getCanAssess();
        OffsetDateTime getNextAvailableAt();
        Integer getAssessmentsRemaining();
    }

    @Query(value = "SELECT can_assess AS canAssess, next_available_at AS nextAvailableAt, assessments_remaining AS assessmentsRemaining FROM public.check_assessment_eligibility(:userId)", nativeQuery = true)
    EligibilityProjection checkEligibility(@Param("userId") UUID userId);
}
