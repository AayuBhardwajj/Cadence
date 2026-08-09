package com.cadence.report.repository;

import com.cadence.report.entity.AssessmentReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssessmentReportRepository extends JpaRepository<AssessmentReport, UUID> {

    Optional<AssessmentReport> findByAssessmentSessionId(UUID assessmentSessionId);
}
