package com.cadence.content.controller;

import com.cadence.content.dto.CourseProgressDto;
import com.cadence.content.dto.LessonDetailDto;
import com.cadence.content.security.CurrentLearnerId;
import com.cadence.content.service.LessonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/lessons")
@RequiredArgsConstructor
@Slf4j
public class LessonController {

    private final LessonService lessonService;

    @GetMapping("/{id}")
    public ResponseEntity<LessonDetailDto> getLessonDetail(
            @PathVariable("id") UUID lessonId,
            @CurrentLearnerId(required = false) UUID currentLearnerId
    ) {
        LessonDetailDto detail = lessonService.getLessonDetail(lessonId, currentLearnerId);
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<CourseProgressDto> completeLesson(
            @PathVariable("id") UUID lessonId,
            @CurrentLearnerId UUID currentLearnerId
    ) {
        CourseProgressDto progress = lessonService.completeLesson(lessonId, currentLearnerId);
        return ResponseEntity.ok(progress);
    }
}
