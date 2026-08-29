package com.cadence.session.repository;

import com.cadence.session.entity.DrillAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DrillAttemptRepository extends JpaRepository<DrillAttempt, UUID> {
    List<DrillAttempt> findByPracticeSessionIdOrderByCreatedAtAsc(UUID practiceSessionId);
}
