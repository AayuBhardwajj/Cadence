package com.cadence.content.repository;

import com.cadence.content.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {

    List<Course> findByPublishedTrueOrderByCreatedAtAsc();

    Optional<Course> findByIdAndPublishedTrue(UUID id);

    Optional<Course> findBySlugAndPublishedTrue(String slug);
}
