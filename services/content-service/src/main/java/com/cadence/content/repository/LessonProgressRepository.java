package com.cadence.content.repository;

import com.cadence.content.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {

    Optional<LessonProgress> findByLessonIdAndLearnerId(UUID lessonId, UUID learnerId);

    @Query("SELECT lp FROM LessonProgress lp WHERE lp.learnerId = :learnerId AND lp.lesson.module.course.id = :courseId")
    List<LessonProgress> findByLearnerIdAndCourseId(@Param("learnerId") UUID learnerId, @Param("courseId") UUID courseId);

    @Query("SELECT COUNT(lp) FROM LessonProgress lp WHERE lp.learnerId = :learnerId AND lp.completed = true AND lp.lesson.module.course.id = :courseId")
    long countCompletedByLearnerIdAndCourseId(@Param("learnerId") UUID learnerId, @Param("courseId") UUID courseId);
}
