package com.cadence.content.service;

import com.cadence.content.dto.ExerciseAttemptResponse;
import com.cadence.content.entity.Course;
import com.cadence.content.entity.CourseModule;
import com.cadence.content.entity.Exercise;
import com.cadence.content.entity.ExerciseAttempt;
import com.cadence.content.entity.Lesson;
import com.cadence.content.repository.ExerciseAttemptRepository;
import com.cadence.content.repository.ExerciseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ExerciseServiceTest {

    private ExerciseRepository exerciseRepository;
    private ExerciseAttemptRepository exerciseAttemptRepository;
    private ExerciseService exerciseService;

    private UUID exerciseId;
    private UUID learnerId;
    private Exercise sampleExercise;

    @BeforeEach
    void setUp() {
        exerciseRepository = mock(ExerciseRepository.class);
        exerciseAttemptRepository = mock(ExerciseAttemptRepository.class);

        exerciseService = new ExerciseService(exerciseRepository, exerciseAttemptRepository);

        exerciseId = UUID.randomUUID();
        learnerId = UUID.randomUUID();

        Course course = Course.builder()
                .id(UUID.randomUUID())
                .published(true)
                .build();

        CourseModule module = CourseModule.builder()
                .id(UUID.randomUUID())
                .course(course)
                .build();

        Lesson lesson = Lesson.builder()
                .id(UUID.randomUUID())
                .module(module)
                .published(true)
                .build();

        sampleExercise = Exercise.builder()
                .id(exerciseId)
                .lesson(lesson)
                .title("Thought Boundaries Drill")
                .instruction("Select the best phrasing.")
                .exerciseType("MULTIPLE_CHOICE")
                .promptText("Which sentence contains natural thought pauses?")
                .correctAnswer("opt_b")
                .options(List.of(
                        Map.of("id", "opt_a", "text", "Option A without pauses.", "explanation", "Too rushed."),
                        Map.of("id", "opt_b", "text", "Option B // with natural pause.", "explanation", "Correct! Excellent cadence.")
                ))
                .orderIndex(0)
                .build();

        when(exerciseAttemptRepository.save(any(ExerciseAttempt.class))).thenAnswer(invocation -> {
            ExerciseAttempt a = invocation.getArgument(0);
            return ExerciseAttempt.builder()
                    .id(UUID.randomUUID())
                    .exercise(a.getExercise())
                    .learnerId(a.getLearnerId())
                    .responseText(a.getResponseText())
                    .isCorrect(a.getIsCorrect())
                    .score(a.getScore())
                    .feedback(a.getFeedback())
                    .build();
        });
    }

    @Test
    void submitAttempt_blankResponse_throwsBadRequest() {
        assertThrows(ResponseStatusException.class, () ->
                exerciseService.submitAttempt(exerciseId, learnerId, "   "));
    }

    @Test
    void submitAttempt_multipleChoice_correct() {
        when(exerciseRepository.findById(exerciseId)).thenReturn(Optional.of(sampleExercise));

        ExerciseAttemptResponse response = exerciseService.submitAttempt(exerciseId, learnerId, "opt_b");

        assertNotNull(response);
        assertTrue(response.isCorrect());
        assertEquals(100, response.getScore());
        assertEquals("Correct! Excellent cadence.", response.getFeedback());
        verify(exerciseAttemptRepository).save(any(ExerciseAttempt.class));
    }

    @Test
    void submitAttempt_multipleChoice_incorrect() {
        when(exerciseRepository.findById(exerciseId)).thenReturn(Optional.of(sampleExercise));

        ExerciseAttemptResponse response = exerciseService.submitAttempt(exerciseId, learnerId, "opt_a");

        assertNotNull(response);
        assertFalse(response.isCorrect());
        assertEquals(0, response.getScore());
        assertEquals("Too rushed.", response.getFeedback());
    }

    @Test
    void submitAttempt_sentenceRepetition_exactMatch() {
        Exercise repetitionEx = Exercise.builder()
                .id(exerciseId)
                .lesson(sampleExercise.getLesson())
                .title("Repetition Drill")
                .instruction("Repeat the sentence.")
                .exerciseType("SENTENCE_REPETITION")
                .promptText("Good morning team, let us review our quarterly results.")
                .correctAnswer("Good morning team, let us review our quarterly results.")
                .build();

        when(exerciseRepository.findById(exerciseId)).thenReturn(Optional.of(repetitionEx));

        ExerciseAttemptResponse response = exerciseService.submitAttempt(
                exerciseId, learnerId, "good morning team let us review our quarterly results");

        assertNotNull(response);
        assertTrue(response.isCorrect());
        assertEquals(100, response.getScore());
        assertTrue(response.getFeedback().contains("Flawless"));
    }

    @Test
    void submitAttempt_sentenceRepetition_partialMatch() {
        Exercise repetitionEx = Exercise.builder()
                .id(exerciseId)
                .lesson(sampleExercise.getLesson())
                .title("Repetition Drill")
                .instruction("Repeat the sentence.")
                .exerciseType("SENTENCE_REPETITION")
                .promptText("Good morning team, let us review our quarterly results.")
                .correctAnswer("Good morning team, let us review our quarterly results.")
                .build();

        when(exerciseRepository.findById(exerciseId)).thenReturn(Optional.of(repetitionEx));

        ExerciseAttemptResponse response = exerciseService.submitAttempt(
                exerciseId, learnerId, "good morning team let us review the results");

        assertNotNull(response);
        assertTrue(response.isCorrect());
        assertEquals(85, response.getScore());
        assertTrue(response.getFeedback().contains("Strong attempt"));
    }

    @Test
    void submitAttempt_speakingPrompt_evaluation() {
        Exercise speakingEx = Exercise.builder()
                .id(exerciseId)
                .lesson(sampleExercise.getLesson())
                .title("Speaking Prompt")
                .instruction("Share your thoughts.")
                .exerciseType("SPEAKING_PROMPT")
                .promptText("Describe your typical workday communication.")
                .build();

        when(exerciseRepository.findById(exerciseId)).thenReturn(Optional.of(speakingEx));

        // Short response (< 5 words)
        ExerciseAttemptResponse shortResp = exerciseService.submitAttempt(exerciseId, learnerId, "I work a lot.");
        assertFalse(shortResp.isCorrect());
        assertEquals(40, shortResp.getScore());

        // Full response (>= 5 words)
        ExerciseAttemptResponse goodResp = exerciseService.submitAttempt(
                exerciseId, learnerId, "I start my morning by greeting the team and setting daily goals.");
        assertTrue(goodResp.isCorrect());
        assertEquals(90, goodResp.getScore());
    }
}
