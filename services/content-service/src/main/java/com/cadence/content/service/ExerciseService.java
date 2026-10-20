package com.cadence.content.service;

import com.cadence.content.dto.ExerciseAttemptResponse;
import com.cadence.content.entity.Exercise;
import com.cadence.content.entity.ExerciseAttempt;
import com.cadence.content.repository.ExerciseAttemptRepository;
import com.cadence.content.repository.ExerciseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final ExerciseAttemptRepository exerciseAttemptRepository;

    @Transactional
    public ExerciseAttemptResponse submitAttempt(UUID exerciseId, UUID learnerId, String responseText) {
        if (responseText == null || responseText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Response text cannot be empty");
        }

        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exercise not found"));

        if (!Boolean.TRUE.equals(exercise.getLesson().getPublished())
                || !Boolean.TRUE.equals(exercise.getLesson().getModule().getCourse().getPublished())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Exercise belongs to an unpublished curriculum");
        }

        EvaluationResult eval = evaluate(exercise, responseText.trim());

        ExerciseAttempt attempt = ExerciseAttempt.builder()
                .exercise(exercise)
                .learnerId(learnerId)
                .responseText(responseText.trim())
                .isCorrect(eval.isCorrect())
                .score(eval.score())
                .feedback(eval.feedback())
                .build();

        attempt = exerciseAttemptRepository.save(attempt);
        log.info("Recorded attempt for exercise {} by learner {}: score={}", exerciseId, learnerId, eval.score());

        return ExerciseAttemptResponse.builder()
                .id(attempt.getId())
                .exerciseId(exerciseId)
                .isCorrect(attempt.getIsCorrect())
                .score(attempt.getScore())
                .feedback(attempt.getFeedback())
                .attemptedAt(attempt.getAttemptedAt())
                .build();
    }

    private EvaluationResult evaluate(Exercise exercise, String response) {
        String type = exercise.getExerciseType() != null ? exercise.getExerciseType().toUpperCase() : "MULTIPLE_CHOICE";

        switch (type) {
            case "MULTIPLE_CHOICE": {
                String correct = exercise.getCorrectAnswer() != null ? exercise.getCorrectAnswer().trim() : "";
                boolean isMatch = correct.equalsIgnoreCase(response);

                String explanation = null;
                List<Map<String, Object>> options = exercise.getOptions();
                if (options != null) {
                    for (Map<String, Object> opt : options) {
                        String optId = String.valueOf(opt.get("id"));
                        if (optId.equalsIgnoreCase(response)) {
                            explanation = (String) opt.get("explanation");
                            break;
                        }
                    }
                }

                if (isMatch) {
                    String fb = explanation != null ? explanation : "Correct! Excellent choice.";
                    return new EvaluationResult(true, 100, fb);
                } else {
                    String fb = explanation != null ? explanation : "Incorrect. Review the lesson explanation and try again.";
                    return new EvaluationResult(false, 0, fb);
                }
            }

            case "SENTENCE_REPETITION": {
                String target = exercise.getCorrectAnswer() != null ? exercise.getCorrectAnswer() : exercise.getPromptText();
                String cleanTarget = normalize(target);
                String cleanResponse = normalize(response);

                if (cleanTarget.equals(cleanResponse)) {
                    return new EvaluationResult(
                            true,
                            100,
                            "Flawless repetition! You captured the full sentence cadence, syllable stress, and thought boundaries."
                    );
                }

                double similarity = calculateWordOverlap(cleanTarget, cleanResponse);
                if (similarity >= 0.75) {
                    return new EvaluationResult(
                            true,
                            85,
                            "Strong attempt! You maintained the core thought group structure with minor pronunciation or omission variance."
                    );
                } else {
                    return new EvaluationResult(
                            false,
                            45,
                            "Good effort, but several key words were missed or altered. Re-read the target phrase slowly, focusing on each thought group."
                    );
                }
            }

            case "SPEAKING_PROMPT":
            default: {
                String[] words = response.split("\\s+");
                if (words.length < 5) {
                    return new EvaluationResult(
                            false,
                            40,
                            "Response is too brief. Try to express a complete thought of at least 2 to 3 sentences using the lesson techniques."
                    );
                }
                return new EvaluationResult(
                        true,
                        90,
                        "Thoughtful response! You applied the lesson principles and structured your spoken thoughts clearly."
                    );
            }
        }
    }

    private String normalize(String str) {
        if (str == null) return "";
        return str.toLowerCase().replaceAll("[^a-z0-9\\s]", "").replaceAll("\\s+", " ").trim();
    }

    private double calculateWordOverlap(String target, String actual) {
        String[] targetWords = target.split("\\s+");
        String[] actualWords = actual.split("\\s+");
        if (targetWords.length == 0) return 0.0;

        int matches = 0;
        for (String tw : targetWords) {
            for (String aw : actualWords) {
                if (tw.equals(aw)) {
                    matches++;
                    break;
                }
            }
        }
        return (double) matches / targetWords.length;
    }

    private record EvaluationResult(boolean isCorrect, int score, String feedback) {}
}
