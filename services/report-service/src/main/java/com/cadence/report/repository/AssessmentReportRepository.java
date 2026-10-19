package com.cadence.report.repository;

import com.cadence.report.entity.AssessmentReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssessmentReportRepository extends JpaRepository<AssessmentReport, UUID> {

    Optional<AssessmentReport> findByAssessmentSessionId(UUID assessmentSessionId);

    @Query("""
        SELECT r FROM AssessmentReport r, AssessmentSession s
        WHERE r.assessmentSessionId = s.id
          AND r.assessmentSessionId = :sessionId
          AND s.userId = :userId
    """)
    Optional<AssessmentReport> findBySessionIdAndUserId(
            @Param("sessionId") UUID sessionId,
            @Param("userId") UUID userId
    );
}
