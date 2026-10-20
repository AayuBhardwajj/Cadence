package com.cadence.content.controller;

import com.cadence.content.dto.CourseDetailDto;
import com.cadence.content.dto.CourseProgressDto;
import com.cadence.content.dto.CourseSummaryDto;
import com.cadence.content.security.CurrentLearnerId;
import com.cadence.content.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@Slf4j
public class CourseController {

    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<List<CourseSummaryDto>> getCourses(
            @CurrentLearnerId(required = false) UUID currentLearnerId
    ) {
        List<CourseSummaryDto> courses = courseService.getPublishedCourses(currentLearnerId);
        return ResponseEntity.ok(courses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDetailDto> getCourseDetail(
            @PathVariable("id") UUID courseId,
            @CurrentLearnerId(required = false) UUID currentLearnerId
    ) {
        CourseDetailDto detail = courseService.getCourseDetail(courseId, currentLearnerId);
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/{id}/enroll")
    public ResponseEntity<CourseProgressDto> enrollCourse(
            @PathVariable("id") UUID courseId,
            @CurrentLearnerId UUID currentLearnerId
    ) {
        CourseProgressDto progress = courseService.enrollLearner(courseId, currentLearnerId);
        return ResponseEntity.ok(progress);
    }

    @GetMapping("/{id}/progress")
    public ResponseEntity<CourseProgressDto> getCourseProgress(
            @PathVariable("id") UUID courseId,
            @CurrentLearnerId UUID currentLearnerId
    ) {
        CourseProgressDto progress = courseService.getCourseProgress(courseId, currentLearnerId);
        return ResponseEntity.ok(progress);
    }
}
