package com.cadence.session.service;

import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.dto.StartSessionResponse;
import com.cadence.session.dto.UploadAssessmentResponse;
import com.cadence.session.entity.AssessmentSession;
import com.cadence.session.entity.LegacyAssessment;
import com.cadence.session.repository.AssessmentSessionRepository;
import com.cadence.session.repository.LegacyAssessmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private final EligibilityService eligibilityService;
    private final LegacyAssessmentRepository legacyAssessmentRepository;
    private final AssessmentSessionRepository assessmentSessionRepository;
    private final SupabaseStorageService supabaseStorageService;
    private final AmqpPublisherService amqpPublisherService;

    /**
     * Intentionally NOT @Transactional: each save() must commit independently so
     * the
     * assessments hard-fail and assessment_sessions soft-fail are isolated
     * transactions,
     * not one atomic unit. If @Transactional were added here, a failure during the
     * second
     * save() would mark the transaction rollback-only and undo the legacy
     * assessments insert,
     * destroying the intended D6 dual-write contract. See DECISIONS.md D6 addendum.
     */
    public StartSessionResponse createSession(UUID userId) {
        EligibilityResponse eligibility = eligibilityService.getEligibility(userId);
        if (eligibility == null || !eligibility.canAssess()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Assessment not available yet.");
        }

        UUID newSessionId = UUID.randomUUID();

        // 1. Primary write to legacy assessments table (hard-fail if this fails)
        try {
            LegacyAssessment legacyAssessment = LegacyAssessment.builder()
                    .id(newSessionId)
                    .userId(userId)
                    .build();
            legacyAssessmentRepository.save(legacyAssessment);
        } catch (Exception insertErr) {
            log.error("Failed to insert legacy assessment row for session {}", newSessionId, insertErr);
            throw new RuntimeException("Failed to insert legacy assessment: " + insertErr.getMessage(), insertErr);
        }

        // 2. Dual-write to assessment_sessions table (soft-fail if this fails)
        List<String> persistenceWarnings = new ArrayList<>();
        try {
            AssessmentSession assessmentSession = AssessmentSession.builder()
                    .id(newSessionId)
                    .userId(userId)
                    .status("pending")
                    .createdAt(OffsetDateTime.now())
                    // .startedAt(OffsetDateTime.now())
                    .build();
            assessmentSessionRepository.save(assessmentSession);
        } catch (Exception err) {
            log.error("dual-write: assessment_sessions insert failed for session {} — continuing", newSessionId, err);
            persistenceWarnings.add("Failed to create assessment_sessions row: " + err.getClass().getSimpleName());
        }

        return StartSessionResponse.builder()
                .status("success")
                .sessionId(newSessionId)
                .persistenceWarnings(persistenceWarnings)
                .build();
    }

    /**
     * Ingests candidate speech recording, persists to Supabase Storage bucket 'assessment-recordings',
     * updates assessment_sessions (status='uploading', audio_storage_path), and returns signed URL reference.
     */
    public UploadAssessmentResponse uploadAssessment(
            UUID userId,
            UUID sessionId,
            String topicId,
            Integer duration,
            org.springframework.web.multipart.MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is missing or empty.");
        }

        String contentType = file.getContentType();
        List<String> allowedTypes = List.of(
                "audio/webm", "video/webm", "audio/wav", "audio/mp4", "video/mp4", "audio/mpeg", "application/octet-stream"
        );
        if (contentType != null && !allowedTypes.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file type: " + contentType);
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "recording.webm";
        String fileExt = originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf(".") + 1) : "webm";
        String storagePath = String.format("%s/%s.%s", userId, sessionId, fileExt);

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            log.error("Failed to read upload file bytes for session {}", sessionId, e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read upload file: " + e.getMessage());
        }

        // 1. Upload file bytes to Supabase Storage
        String uploadedPath = supabaseStorageService.uploadFile(storagePath, bytes, contentType);

        // 2. Generate 1-hour signed URL
        String signedUrl = supabaseStorageService.createSignedUrl(uploadedPath, 3600);

        // 3. Update assessment_sessions (status='uploading' per live constraint, audio_storage_path)
        List<String> persistenceWarnings = new ArrayList<>();
        try {
            var existingSessionOpt = assessmentSessionRepository.findById(sessionId);
            if (existingSessionOpt.isPresent()) {
                AssessmentSession session = existingSessionOpt.get();
                session.setStatus("uploading");
                session.setAudioStoragePath(uploadedPath);
                if (topicId != null && !topicId.trim().isEmpty()) {
                    session.setTopicId(topicId);
                }
                if (duration != null && duration > 0) {
                    session.setDurationSeconds(duration);
                }
                assessmentSessionRepository.save(session);
                log.info("Updated assessment_sessions {} status=uploading audio_storage_path={}", sessionId, uploadedPath);
            } else {
                AssessmentSession newSession = AssessmentSession.builder()
                        .id(sessionId)
                        .userId(userId)
                        .topicId(topicId)
                        .status("uploading")
                        .durationSeconds(duration)
                        .audioStoragePath(uploadedPath)
                        .createdAt(OffsetDateTime.now())
                        .build();
                assessmentSessionRepository.save(newSession);
                log.info("Created new assessment_sessions {} status=uploading audio_storage_path={}", sessionId, uploadedPath);
            }
        } catch (Exception err) {
            log.error("Failed to update assessment_sessions with storage path for session {}: {}", sessionId, err.getMessage(), err);
            persistenceWarnings.add("Failed to update assessment_sessions: " + err.getClass().getSimpleName());
        }

        // 4. Publish analysis.requested to RabbitMQ (Phase 3 Stage 1 — D-impl-2, 2026-08-21)
        // SOFT-FAIL: consistent with D6 dual-write pattern. Failure adds persistence_warning but
        // does not block the HTTP response — the audio file is already safely stored.
        //
        // IMPORTANT — stuck-session gap (D-impl-2 explicit statement):
        // A failed publish leaves assessment_sessions.status = 'uploading' with no analysis.requested
        // ever published. This session is stuck. Detection today is manual only:
        //   SELECT id, status, created_at FROM assessment_sessions
        //   WHERE status = 'uploading' AND created_at < NOW() - INTERVAL '10 minutes';
        // No automated watchdog exists. See AmqpPublisherService.java and BUGS_AND_ISSUES.md.
        try {
            amqpPublisherService.publishAnalysisRequested(sessionId, userId, uploadedPath);
        } catch (Exception amqpErr) {
            log.error("AMQP publish failed for analysis.requested session={}: {} — session stuck in status='uploading'",
                    sessionId, amqpErr.getMessage(), amqpErr);
            persistenceWarnings.add("Failed to publish analysis.requested: " + amqpErr.getClass().getSimpleName());
        }

        return UploadAssessmentResponse.builder()
                .status("success")
                .sessionId(sessionId)
                .storagePath(uploadedPath)
                .signedUrl(signedUrl)
                .bucket("assessment-recordings")
                .persistenceWarnings(persistenceWarnings)
                .build();
    }
}
