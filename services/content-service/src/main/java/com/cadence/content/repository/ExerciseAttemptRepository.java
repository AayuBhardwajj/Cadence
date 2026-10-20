package com.cadence.content.repository;

import com.cadence.content.entity.ExerciseAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExerciseAttemptRepository extends JpaRepository<ExerciseAttempt, UUID> {

    List<ExerciseAttempt> findByExerciseIdAndLearnerIdOrderByAttemptedAtDesc(UUID exerciseId, UUID learnerId);

    List<ExerciseAttempt> findByLearnerIdOrderByAttemptedAtDesc(UUID learnerId);
}
