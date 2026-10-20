package com.cadence.content.repository;

import com.cadence.content.entity.CourseEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, UUID> {

    Optional<CourseEnrollment> findByCourseIdAndLearnerId(UUID courseId, UUID learnerId);

    List<CourseEnrollment> findByLearnerId(UUID learnerId);
}
