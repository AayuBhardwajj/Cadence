package com.cadence.content.service;

import com.cadence.content.dto.CourseProgressDto;
import com.cadence.content.dto.ExerciseDto;
import com.cadence.content.dto.LessonDetailDto;
import com.cadence.content.entity.Course;
import com.cadence.content.entity.CourseEnrollment;
import com.cadence.content.entity.Exercise;
import com.cadence.content.entity.ExerciseAttempt;
import com.cadence.content.entity.Lesson;
import com.cadence.content.entity.LessonProgress;
import com.cadence.content.repository.CourseEnrollmentRepository;
import com.cadence.content.repository.ExerciseAttemptRepository;
import com.cadence.content.repository.ExerciseRepository;
import com.cadence.content.repository.LessonProgressRepository;
import com.cadence.content.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonService {

    private final LessonRepository lessonRepository;
    private final ExerciseRepository exerciseRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final ExerciseAttemptRepository exerciseAttemptRepository;
    private final CourseService courseService;

    @Transactional(readOnly = true)
    public LessonDetailDto getLessonDetail(UUID lessonId, UUID currentLearnerId) {
        Lesson lesson = lessonRepository.findByIdAndPublishedTrue(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found or unpublished"));

        Course course = lesson.getModule().getCourse();
        if (!Boolean.TRUE.equals(course.getPublished())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Course is not published");
        }

        // Determine next and previous lessons in the course curriculum
        List<Lesson> courseLessons = lessonRepository.findAllByCourseIdPublishedOrderByModuleAndLessonOrder(course.getId());
        UUID prevLessonId = null;
        UUID nextLessonId = null;

        for (int i = 0; i < courseLessons.size(); i++) {
            if (courseLessons.get(i).getId().equals(lessonId)) {
                if (i > 0) prevLessonId = courseLessons.get(i - 1).getId();
                if (i < courseLessons.size() - 1) nextLessonId = courseLessons.get(i + 1).getId();
                break;
            }
        }

        // Fetch exercises for this lesson
        List<Exercise> exercises = exerciseRepository.findByLessonIdOrderByOrderIndexAsc(lessonId);

        boolean completed = false;
        if (currentLearnerId != null) {
            Optional<LessonProgress> lpOpt = lessonProgressRepository.findByLessonIdAndLearnerId(lessonId, currentLearnerId);
            completed = lpOpt.isPresent() && Boolean.TRUE.equals(lpOpt.get().getCompleted());
        }

        final UUID learnerId = currentLearnerId;
        List<ExerciseDto> exerciseDtos = exercises.stream().map(ex -> {
            boolean exCompleted = false;
            Integer prevScore = null;
            String prevFeedback = null;

            if (learnerId != null) {
                List<ExerciseAttempt> attempts = exerciseAttemptRepository.findByExerciseIdAndLearnerIdOrderByAttemptedAtDesc(ex.getId(), learnerId);
                if (!attempts.isEmpty()) {
                    ExerciseAttempt latest = attempts.get(0);
                    exCompleted = Boolean.TRUE.equals(latest.getIsCorrect());
                    prevScore = latest.getScore();
                    prevFeedback = latest.getFeedback();
                }
            }

            return ExerciseDto.builder()
                    .id(ex.getId())
                    .lessonId(lesson.getId())
                    .title(ex.getTitle())
                    .instruction(ex.getInstruction())
                    .exerciseType(ex.getExerciseType())
                    .promptText(ex.getPromptText())
                    .options(ex.getOptions())
                    .hints(ex.getHints())
                    .orderIndex(ex.getOrderIndex())
                    .completed(exCompleted)
                    .previousScore(prevScore)
                    .previousFeedback(prevFeedback)
                    .build();
        }).collect(Collectors.toList());

        return LessonDetailDto.builder()
                .id(lesson.getId())
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .moduleId(lesson.getModule().getId())
                .moduleTitle(lesson.getModule().getTitle())
                .title(lesson.getTitle())
                .description(lesson.getDescription())
                .orderIndex(lesson.getOrderIndex())
                .durationMinutes(lesson.getDurationMinutes())
                .contentMarkdown(lesson.getContentMarkdown())
                .keyTakeaways(lesson.getKeyTakeaways())
                .completed(completed)
                .prevLessonId(prevLessonId)
                .nextLessonId(nextLessonId)
                .exercises(exerciseDtos)
                .build();
    }

    @Transactional
    public CourseProgressDto completeLesson(UUID lessonId, UUID learnerId) {
        Lesson lesson = lessonRepository.findByIdAndPublishedTrue(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found or unpublished"));

        Course course = lesson.getModule().getCourse();
        if (!Boolean.TRUE.equals(course.getPublished())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Course is not published");
        }

        // 1. Update or create lesson progress
        Optional<LessonProgress> lpOpt = lessonProgressRepository.findByLessonIdAndLearnerId(lessonId, learnerId);
        LessonProgress progress;
        if (lpOpt.isPresent()) {
            progress = lpOpt.get();
            progress.setCompleted(true);
            progress.setCompletedAt(OffsetDateTime.now());
            progress.setLastAccessedAt(OffsetDateTime.now());
        } else {
            progress = LessonProgress.builder()
                    .lesson(lesson)
                    .learnerId(learnerId)
                    .completed(true)
                    .completedAt(OffsetDateTime.now())
                    .lastAccessedAt(OffsetDateTime.now())
                    .build();
        }
        lessonProgressRepository.save(progress);
        log.info("Learner {} completed lesson {}", learnerId, lessonId);

        // 2. Ensure enrollment is tracked and updated
        Optional<CourseEnrollment> enrollOpt = courseEnrollmentRepository.findByCourseIdAndLearnerId(course.getId(), learnerId);
        CourseEnrollment enrollment;
        if (enrollOpt.isPresent()) {
            enrollment = enrollOpt.get();
            enrollment.setLastAccessedAt(OffsetDateTime.now());
        } else {
            enrollment = CourseEnrollment.builder()
                    .course(course)
                    .learnerId(learnerId)
                    .enrolledAt(OffsetDateTime.now())
                    .lastAccessedAt(OffsetDateTime.now())
                    .build();
        }

        // 3. Find next lesson or mark course completed
        List<Lesson> allCourseLessons = lessonRepository.findAllByCourseIdPublishedOrderByModuleAndLessonOrder(course.getId());
        List<LessonProgress> completedProgress = lessonProgressRepository.findByLearnerIdAndCourseId(learnerId, course.getId());
        List<UUID> completedIds = completedProgress.stream()
                .filter(lp -> Boolean.TRUE.equals(lp.getCompleted()))
                .map(lp -> lp.getLesson().getId())
                .toList();

        // Advance currentLessonId to the next uncompleted lesson
        UUID nextUncompleted = null;
        for (Lesson cl : allCourseLessons) {
            if (!completedIds.contains(cl.getId())) {
                nextUncompleted = cl.getId();
                break;
            }
        }

        enrollment.setCurrentLessonId(nextUncompleted != null ? nextUncompleted : lessonId);

        if (allCourseLessons.size() > 0 && completedIds.size() >= allCourseLessons.size()) {
            if (enrollment.getCompletedAt() == null) {
                enrollment.setCompletedAt(OffsetDateTime.now());
                log.info("Learner {} completed entire course {}", learnerId, course.getId());
            }
        }

        courseEnrollmentRepository.save(enrollment);

        return courseService.getCourseProgress(course.getId(), learnerId);
    }
}
