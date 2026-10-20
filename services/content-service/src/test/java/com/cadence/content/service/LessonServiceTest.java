package com.cadence.content.service;

import com.cadence.content.dto.CourseProgressDto;
import com.cadence.content.dto.LessonDetailDto;
import com.cadence.content.entity.*;
import com.cadence.content.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LessonServiceTest {

    private LessonRepository lessonRepository;
    private ExerciseRepository exerciseRepository;
    private LessonProgressRepository lessonProgressRepository;
    private CourseEnrollmentRepository courseEnrollmentRepository;
    private ExerciseAttemptRepository exerciseAttemptRepository;
    private CourseService courseService;

    private LessonService lessonService;

    private UUID lessonId;
    private UUID moduleId;
    private UUID courseId;
    private UUID learnerId;
    private Lesson sampleLesson;
    private Course sampleCourse;

    @BeforeEach
    void setUp() {
        lessonRepository = mock(LessonRepository.class);
        exerciseRepository = mock(ExerciseRepository.class);
        lessonProgressRepository = mock(LessonProgressRepository.class);
        courseEnrollmentRepository = mock(CourseEnrollmentRepository.class);
        exerciseAttemptRepository = mock(ExerciseAttemptRepository.class);
        courseService = mock(CourseService.class);

        lessonService = new LessonService(
                lessonRepository,
                exerciseRepository,
                lessonProgressRepository,
                courseEnrollmentRepository,
                exerciseAttemptRepository,
                courseService
        );

        lessonId = UUID.randomUUID();
        moduleId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        learnerId = UUID.randomUUID();

        sampleCourse = Course.builder()
                .id(courseId)
                .title("Sample Course")
                .published(true)
                .build();

        CourseModule module = CourseModule.builder()
                .id(moduleId)
                .course(sampleCourse)
                .title("Sample Module")
                .orderIndex(0)
                .build();

        sampleLesson = Lesson.builder()
                .id(lessonId)
                .module(module)
                .title("Lesson 1: Intro to Cadence")
                .description("Learn basic speech pacing.")
                .contentMarkdown("## Speech Pacing\nPacing is essential.")
                .durationMinutes(8)
                .orderIndex(0)
                .published(true)
                .build();
    }

    @Test
    void getLessonDetail_returnsLessonWithNextAndPrevIds() {
        when(lessonRepository.findByIdAndPublishedTrue(lessonId)).thenReturn(Optional.of(sampleLesson));

        UUID nextLessonId = UUID.randomUUID();
        Lesson nextLesson = Lesson.builder().id(nextLessonId).build();
        when(lessonRepository.findAllByCourseIdPublishedOrderByModuleAndLessonOrder(courseId))
                .thenReturn(List.of(sampleLesson, nextLesson));

        Exercise exercise = Exercise.builder()
                .id(UUID.randomUUID())
                .lesson(sampleLesson)
                .title("Quiz 1")
                .exerciseType("MULTIPLE_CHOICE")
                .orderIndex(0)
                .build();
        when(exerciseRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of(exercise));

        LessonDetailDto detail = lessonService.getLessonDetail(lessonId, null);

        assertNotNull(detail);
        assertEquals("Lesson 1: Intro to Cadence", detail.getTitle());
        assertEquals(nextLessonId, detail.getNextLessonId());
        assertNull(detail.getPrevLessonId());
        assertEquals(1, detail.getExercises().size());
    }

    @Test
    void getLessonDetail_unpublished_throwsNotFound() {
        when(lessonRepository.findByIdAndPublishedTrue(lessonId)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> lessonService.getLessonDetail(lessonId, learnerId));
    }

    @Test
    void completeLesson_updatesProgressAndEnrollment() {
        when(lessonRepository.findByIdAndPublishedTrue(lessonId)).thenReturn(Optional.of(sampleLesson));
        when(lessonProgressRepository.findByLessonIdAndLearnerId(lessonId, learnerId)).thenReturn(Optional.empty());

        UUID nextLessonId = UUID.randomUUID();
        Lesson nextLesson = Lesson.builder().id(nextLessonId).build();
        when(lessonRepository.findAllByCourseIdPublishedOrderByModuleAndLessonOrder(courseId))
                .thenReturn(List.of(sampleLesson, nextLesson));

        CourseEnrollment enrollment = CourseEnrollment.builder()
                .course(sampleCourse)
                .learnerId(learnerId)
                .currentLessonId(lessonId)
                .build();
        when(courseEnrollmentRepository.findByCourseIdAndLearnerId(courseId, learnerId)).thenReturn(Optional.of(enrollment));

        CourseProgressDto expectedProgress = CourseProgressDto.builder()
                .courseId(courseId)
                .enrolled(true)
                .completedLessons(1)
                .progressPercent(50)
                .currentLessonId(nextLessonId)
                .build();
        when(courseService.getCourseProgress(courseId, learnerId)).thenReturn(expectedProgress);

        CourseProgressDto result = lessonService.completeLesson(lessonId, learnerId);

        assertNotNull(result);
        assertEquals(1, result.getCompletedLessons());
        assertEquals(nextLessonId, result.getCurrentLessonId());
        verify(lessonProgressRepository).save(any(LessonProgress.class));
        verify(courseEnrollmentRepository).save(any(CourseEnrollment.class));
    }
}
