package com.cadence.content.repository;

import com.cadence.content.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    List<Lesson> findByModuleIdAndPublishedTrueOrderByOrderIndexAsc(UUID moduleId);

    Optional<Lesson> findByIdAndPublishedTrue(UUID id);

    @Query("SELECT COUNT(l) FROM Lesson l WHERE l.module.course.id = :courseId AND l.published = true")
    long countByCourseIdAndPublishedTrue(@Param("courseId") UUID courseId);

    @Query("SELECT l FROM Lesson l WHERE l.module.course.id = :courseId AND l.published = true ORDER BY l.module.orderIndex ASC, l.orderIndex ASC")
    List<Lesson> findAllByCourseIdPublishedOrderByModuleAndLessonOrder(@Param("courseId") UUID courseId);
}
