package com.cadence.content.service;

import com.cadence.content.dto.CourseDetailDto;
import com.cadence.content.dto.CourseProgressDto;
import com.cadence.content.dto.CourseSummaryDto;
import com.cadence.content.dto.LessonSummaryDto;
import com.cadence.content.dto.ModuleDetailDto;
import com.cadence.content.entity.Course;
import com.cadence.content.entity.CourseEnrollment;
import com.cadence.content.entity.CourseModule;
import com.cadence.content.entity.Lesson;
import com.cadence.content.entity.LessonProgress;
import com.cadence.content.repository.CourseEnrollmentRepository;
import com.cadence.content.repository.CourseModuleRepository;
import com.cadence.content.repository.CourseRepository;
import com.cadence.content.repository.LessonProgressRepository;
import com.cadence.content.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseService {

    private final CourseRepository courseRepository;
    private final CourseModuleRepository courseModuleRepository;
    private final LessonRepository lessonRepository;
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;

    @Transactional(readOnly = true)
    public List<CourseSummaryDto> getPublishedCourses(UUID currentLearnerId) {
        List<Course> courses = courseRepository.findByPublishedTrueOrderByCreatedAtAsc();

        return courses.stream().map(course -> {
            long totalLessons = lessonRepository.countByCourseIdAndPublishedTrue(course.getId());
            boolean enrolled = false;
            long completedLessons = 0;
            UUID currentLessonId = null;

            if (currentLearnerId != null) {
                Optional<CourseEnrollment> enrollmentOpt = courseEnrollmentRepository.findByCourseIdAndLearnerId(course.getId(), currentLearnerId);
                if (enrollmentOpt.isPresent()) {
                    enrolled = true;
                    currentLessonId = enrollmentOpt.get().getCurrentLessonId();
                    completedLessons = lessonProgressRepository.countCompletedByLearnerIdAndCourseId(currentLearnerId, course.getId());
                }
            }

            int progressPercent = totalLessons > 0 ? (int) Math.round(((double) completedLessons / totalLessons) * 100) : 0;

            return CourseSummaryDto.builder()
                    .id(course.getId())
                    .title(course.getTitle())
                    .slug(course.getSlug())
                    .description(course.getDescription())
                    .shortDescription(course.getShortDescription())
                    .level(course.getLevel())
                    .category(course.getCategory())
                    .estimatedMinutes(course.getEstimatedMinutes())
                    .thumbnailUrl(course.getThumbnailUrl())
                    .totalLessons(totalLessons)
                    .completedLessons(completedLessons)
                    .progressPercent(progressPercent)
                    .enrolled(enrolled)
                    .currentLessonId(currentLessonId)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CourseDetailDto getCourseDetail(UUID courseId, UUID currentLearnerId) {
        Course course = courseRepository.findByIdAndPublishedTrue(courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found or unpublished"));

        List<CourseModule> modules = courseModuleRepository.findByCourseIdOrderByOrderIndexAsc(courseId);

        Set<UUID> completedLessonIds = Set.of();
        boolean enrolled = false;
        UUID currentLessonId = null;

        if (currentLearnerId != null) {
            Optional<CourseEnrollment> enrollmentOpt = courseEnrollmentRepository.findByCourseIdAndLearnerId(courseId, currentLearnerId);
            if (enrollmentOpt.isPresent()) {
                enrolled = true;
                currentLessonId = enrollmentOpt.get().getCurrentLessonId();
            }
            List<LessonProgress> progressList = lessonProgressRepository.findByLearnerIdAndCourseId(currentLearnerId, courseId);
            completedLessonIds = progressList.stream()
                    .filter(lp -> Boolean.TRUE.equals(lp.getCompleted()))
                    .map(lp -> lp.getLesson().getId())
                    .collect(Collectors.toSet());
        }

        long totalLessons = 0;
        List<ModuleDetailDto> moduleDtos = new ArrayList<>();

        for (CourseModule module : modules) {
            List<Lesson> lessons = lessonRepository.findByModuleIdAndPublishedTrueOrderByOrderIndexAsc(module.getId());
            totalLessons += lessons.size();

            final Set<UUID> completedSet = completedLessonIds;
            List<LessonSummaryDto> lessonDtos = lessons.stream().map(lesson -> LessonSummaryDto.builder()
                    .id(lesson.getId())
                    .title(lesson.getTitle())
                    .description(lesson.getDescription())
                    .orderIndex(lesson.getOrderIndex())
                    .durationMinutes(lesson.getDurationMinutes())
                    .completed(completedSet.contains(lesson.getId()))
                    .build()
            ).collect(Collectors.toList());

            moduleDtos.add(ModuleDetailDto.builder()
                    .id(module.getId())
                    .title(module.getTitle())
                    .description(module.getDescription())
                    .orderIndex(module.getOrderIndex())
                    .lessons(lessonDtos)
                    .build()
            );
        }

        long completedCount = completedLessonIds.size();
        int progressPercent = totalLessons > 0 ? (int) Math.round(((double) completedCount / totalLessons) * 100) : 0;

        return CourseDetailDto.builder()
                .id(course.getId())
                .title(course.getTitle())
                .slug(course.getSlug())
                .description(course.getDescription())
                .shortDescription(course.getShortDescription())
                .level(course.getLevel())
                .category(course.getCategory())
                .estimatedMinutes(course.getEstimatedMinutes())
                .thumbnailUrl(course.getThumbnailUrl())
                .totalLessons(totalLessons)
                .completedLessons(completedCount)
                .progressPercent(progressPercent)
                .enrolled(enrolled)
                .currentLessonId(currentLessonId)
                .modules(moduleDtos)
                .build();
    }

    @Transactional
    public CourseProgressDto enrollLearner(UUID courseId, UUID learnerId) {
        Course course = courseRepository.findByIdAndPublishedTrue(courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found or unpublished"));

        Optional<CourseEnrollment> existingOpt = courseEnrollmentRepository.findByCourseIdAndLearnerId(courseId, learnerId);
        CourseEnrollment enrollment;

        if (existingOpt.isPresent()) {
            enrollment = existingOpt.get();
            enrollment.setLastAccessedAt(OffsetDateTime.now());
        } else {
            List<Lesson> allLessons = lessonRepository.findAllByCourseIdPublishedOrderByModuleAndLessonOrder(courseId);
            UUID firstLessonId = allLessons.isEmpty() ? null : allLessons.get(0).getId();

            enrollment = CourseEnrollment.builder()
                    .course(course)
                    .learnerId(learnerId)
                    .enrolledAt(OffsetDateTime.now())
                    .lastAccessedAt(OffsetDateTime.now())
                    .currentLessonId(firstLessonId)
                    .build();
            enrollment = courseEnrollmentRepository.save(enrollment);
            log.info("Enrolled learner {} in course {}", learnerId, courseId);
        }

        return getCourseProgress(courseId, learnerId);
    }

    @Transactional(readOnly = true)
    public CourseProgressDto getCourseProgress(UUID courseId, UUID learnerId) {
        Course course = courseRepository.findByIdAndPublishedTrue(courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found or unpublished"));

        Optional<CourseEnrollment> enrollmentOpt = courseEnrollmentRepository.findByCourseIdAndLearnerId(courseId, learnerId);
        long totalLessons = lessonRepository.countByCourseIdAndPublishedTrue(courseId);

        if (enrollmentOpt.isEmpty()) {
            return CourseProgressDto.builder()
                    .courseId(courseId)
                    .enrolled(false)
                    .totalLessons(totalLessons)
                    .completedLessons(0)
                    .progressPercent(0)
                    .completedLessonIds(List.of())
                    .build();
        }

        CourseEnrollment enrollment = enrollmentOpt.get();
        List<LessonProgress> progressList = lessonProgressRepository.findByLearnerIdAndCourseId(learnerId, courseId);
        List<UUID> completedIds = progressList.stream()
                .filter(lp -> Boolean.TRUE.equals(lp.getCompleted()))
                .map(lp -> lp.getLesson().getId())
                .collect(Collectors.toList());

        long completedCount = completedIds.size();
        int progressPercent = totalLessons > 0 ? (int) Math.round(((double) completedCount / totalLessons) * 100) : 0;

        return CourseProgressDto.builder()
                .courseId(courseId)
                .enrolled(true)
                .totalLessons(totalLessons)
                .completedLessons(completedCount)
                .progressPercent(progressPercent)
                .currentLessonId(enrollment.getCurrentLessonId())
                .enrolledAt(enrollment.getEnrolledAt())
                .completedAt(enrollment.getCompletedAt())
                .completedLessonIds(completedIds)
                .build();
    }
}
