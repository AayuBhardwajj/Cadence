package com.cadence.session.repository;

import com.cadence.session.entity.PracticeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PracticeSessionRepository extends JpaRepository<PracticeSession, UUID> {
    List<PracticeSession> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
