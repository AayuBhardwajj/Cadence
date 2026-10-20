package com.cadence.content.repository;

import com.cadence.content.entity.CourseModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourseModuleRepository extends JpaRepository<CourseModule, UUID> {

    List<CourseModule> findByCourseIdOrderByOrderIndexAsc(UUID courseId);
}
