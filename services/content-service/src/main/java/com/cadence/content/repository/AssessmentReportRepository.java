package com.cadence.content.repository;

import com.cadence.content.entity.AssessmentReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssessmentReportRepository extends JpaRepository<AssessmentReport, UUID> {

    @Query(value = "SELECT ar.* FROM public.assessment_reports ar " +
                   "JOIN public.assessment_sessions s ON ar.assessment_session_id = s.id " +
                   "WHERE s.user_id = :userId " +
                   "ORDER BY s.created_at DESC LIMIT 1", nativeQuery = true)
    Optional<AssessmentReport> findLatestByUserId(@Param("userId") UUID userId);
}
