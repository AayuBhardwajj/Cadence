package com.cadence.report.repository;

import com.cadence.report.entity.AssessmentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AssessmentSessionRepository extends JpaRepository<AssessmentSession, UUID> {
}
