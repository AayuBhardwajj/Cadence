package com.cadence.content.service;

import com.cadence.content.dto.CourseDetailDto;
import com.cadence.content.dto.CourseProgressDto;
import com.cadence.content.dto.CourseSummaryDto;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CourseServiceTest {

    private CourseRepository courseRepository;
    private CourseModuleRepository courseModuleRepository;
    private LessonRepository lessonRepository;
    private CourseEnrollmentRepository courseEnrollmentRepository;
    private LessonProgressRepository lessonProgressRepository;

    private CourseService courseService;

    private UUID courseId;
    private UUID learnerId;
    private Course sampleCourse;

    @BeforeEach
    void setUp() {
        courseRepository = mock(CourseRepository.class);
        courseModuleRepository = mock(CourseModuleRepository.class);
        lessonRepository = mock(LessonRepository.class);
        courseEnrollmentRepository = mock(CourseEnrollmentRepository.class);
        lessonProgressRepository = mock(LessonProgressRepository.class);

        courseService = new CourseService(
                courseRepository,
                courseModuleRepository,
                lessonRepository,
                courseEnrollmentRepository,
                lessonProgressRepository
        );

        courseId = UUID.randomUUID();
        learnerId = UUID.randomUUID();

        sampleCourse = Course.builder()
                .id(courseId)
                .title("Fluency & Cadence Mastery")
                .slug("fluency-cadence-mastery")
                .description("Master speech rhythm and cadence.")
                .level("INTERMEDIATE")
                .category("Fluency & Flow")
                .estimatedMinutes(45)
                .published(true)
                .build();
    }

    @Test
    void getPublishedCourses_returnsPublishedCoursesOnly() {
        when(courseRepository.findByPublishedTrueOrderByCreatedAtAsc()).thenReturn(List.of(sampleCourse));
        when(lessonRepository.countByCourseIdAndPublishedTrue(courseId)).thenReturn(4L);

        List<CourseSummaryDto> result = courseService.getPublishedCourses(null);

        assertEquals(1, result.size());
        assertEquals("Fluency & Cadence Mastery", result.get(0).getTitle());
        assertEquals(4L, result.get(0).getTotalLessons());
        assertFalse(result.get(0).isEnrolled());
    }

    @Test
    void getPublishedCourses_withLearner_includesEnrolledAndProgress() {
        when(courseRepository.findByPublishedTrueOrderByCreatedAtAsc()).thenReturn(List.of(sampleCourse));
        when(lessonRepository.countByCourseIdAndPublishedTrue(courseId)).thenReturn(4L);

        CourseEnrollment enrollment = CourseEnrollment.builder()
                .course(sampleCourse)
                .learnerId(learnerId)
                .currentLessonId(UUID.randomUUID())
                .build();

        when(courseEnrollmentRepository.findByCourseIdAndLearnerId(courseId, learnerId)).thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.countCompletedByLearnerIdAndCourseId(learnerId, courseId)).thenReturn(2L);

        List<CourseSummaryDto> result = courseService.getPublishedCourses(learnerId);

        assertEquals(1, result.size());
        assertTrue(result.get(0).isEnrolled());
        assertEquals(2L, result.get(0).getCompletedLessons());
        assertEquals(50, result.get(0).getProgressPercent());
    }

    @Test
    void getCourseDetail_returnsModulesAndLessonsInOrder() {
        when(courseRepository.findByIdAndPublishedTrue(courseId)).thenReturn(Optional.of(sampleCourse));

        UUID moduleId = UUID.randomUUID();
        CourseModule module = CourseModule.builder()
                .id(moduleId)
                .course(sampleCourse)
                .title("Module 1: Rhythm Basics")
                .orderIndex(0)
                .build();

        when(courseModuleRepository.findByCourseIdOrderByOrderIndexAsc(courseId)).thenReturn(List.of(module));

        Lesson lesson1 = Lesson.builder()
                .id(UUID.randomUUID())
                .module(module)
                .title("Lesson 1.1")
                .orderIndex(0)
                .durationMinutes(10)
                .published(true)
                .build();

        when(lessonRepository.findByModuleIdAndPublishedTrueOrderByOrderIndexAsc(moduleId)).thenReturn(List.of(lesson1));

        CourseDetailDto detail = courseService.getCourseDetail(courseId, null);

        assertNotNull(detail);
        assertEquals("Fluency & Cadence Mastery", detail.getTitle());
        assertEquals(1, detail.getModules().size());
        assertEquals("Module 1: Rhythm Basics", detail.getModules().get(0).getTitle());
        assertEquals(1, detail.getModules().get(0).getLessons().size());
    }

    @Test
    void getCourseDetail_unpublishedCourse_throwsNotFound() {
        when(courseRepository.findByIdAndPublishedTrue(courseId)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> courseService.getCourseDetail(courseId, learnerId));
    }

    @Test
    void enrollLearner_createsNewEnrollmentWithFirstLesson() {
        UUID firstLessonId = UUID.randomUUID();
        Lesson firstLesson = Lesson.builder().id(firstLessonId).build();
        when(lessonRepository.findAllByCourseIdPublishedOrderByModuleAndLessonOrder(courseId)).thenReturn(List.of(firstLesson));
        when(lessonRepository.countByCourseIdAndPublishedTrue(courseId)).thenReturn(1L);

        CourseEnrollment savedEnrollment = CourseEnrollment.builder()
                .course(sampleCourse)
                .learnerId(learnerId)
                .currentLessonId(firstLessonId)
                .build();

        when(courseRepository.findByIdAndPublishedTrue(courseId)).thenReturn(Optional.of(sampleCourse));
        when(courseEnrollmentRepository.save(any(CourseEnrollment.class))).thenReturn(savedEnrollment);
        when(courseEnrollmentRepository.findByCourseIdAndLearnerId(courseId, learnerId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(savedEnrollment));

        CourseProgressDto progress = courseService.enrollLearner(courseId, learnerId);

        assertNotNull(progress);
        assertTrue(progress.isEnrolled());
        assertEquals(firstLessonId, progress.getCurrentLessonId());
        verify(courseEnrollmentRepository).save(any(CourseEnrollment.class));
    }

    @Test
    void getCourseProgress_crossLearnerIsolation() {
        UUID otherLearnerId = UUID.randomUUID();
        when(courseRepository.findByIdAndPublishedTrue(courseId)).thenReturn(Optional.of(sampleCourse));
        when(lessonRepository.countByCourseIdAndPublishedTrue(courseId)).thenReturn(5L);

        // learnerId is enrolled with progress
        CourseEnrollment enrollment = CourseEnrollment.builder()
                .course(sampleCourse)
                .learnerId(learnerId)
                .build();
        when(courseEnrollmentRepository.findByCourseIdAndLearnerId(courseId, learnerId)).thenReturn(Optional.of(enrollment));

        // otherLearnerId is NOT enrolled
        when(courseEnrollmentRepository.findByCourseIdAndLearnerId(courseId, otherLearnerId)).thenReturn(Optional.empty());

        CourseProgressDto progress1 = courseService.getCourseProgress(courseId, learnerId);
        CourseProgressDto progress2 = courseService.getCourseProgress(courseId, otherLearnerId);

        assertTrue(progress1.isEnrolled());
        assertFalse(progress2.isEnrolled());
        assertEquals(0, progress2.getProgressPercent());
    }
}
