package com.cadence.session.repository;

import com.cadence.session.entity.LegacyAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LegacyAssessmentRepository extends JpaRepository<LegacyAssessment, UUID> {
}
