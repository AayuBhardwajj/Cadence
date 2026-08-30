package com.cadence.practice.repository;

import com.cadence.practice.entity.DrillAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DrillAttemptRepository extends JpaRepository<DrillAttempt, UUID> {
    List<DrillAttempt> findByPracticeSessionIdOrderByCreatedAtAsc(UUID practiceSessionId);
}
