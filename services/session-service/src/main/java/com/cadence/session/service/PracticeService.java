package com.cadence.session.service;

import com.cadence.session.dto.CompletePracticeSessionResponse;
import com.cadence.session.dto.DrillAttemptResponse;
import com.cadence.session.dto.StartPracticeSessionResponse;
import com.cadence.session.entity.DrillAttempt;
import com.cadence.session.entity.PracticeSession;
import com.cadence.session.repository.DrillAttemptRepository;
import com.cadence.session.repository.PracticeSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@Slf4j
public class PracticeService {

    /**
     * Tunable WER (Word Error Rate) threshold for drill match gating.
     * Values <= 0.15 are considered successful phonetic matches.
     */
    public static final double WER_THRESHOLD = 0.15;

    private final PracticeSessionRepository practiceSessionRepository;
    private final DrillAttemptRepository drillAttemptRepository;
    private final String mlAudioUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public PracticeService(
            PracticeSessionRepository practiceSessionRepository,
            DrillAttemptRepository drillAttemptRepository,
            @Value("${cadence.ml-audio.url:http://localhost:9001}") String mlAudioUrl,
            ObjectMapper objectMapper
    ) {
        this.practiceSessionRepository = practiceSessionRepository;
        this.drillAttemptRepository = drillAttemptRepository;
        this.mlAudioUrl = mlAudioUrl.replaceAll("/+$", "");
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Transactional
    public StartPracticeSessionResponse startPracticeSession(UUID userId, String bucket) {
        if (bucket == null || bucket.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bucket is required");
        }

        PracticeSession session = PracticeSession.builder()
                .userId(userId)
                .bucket(bucket.trim())
                .status("in_progress")
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();

        PracticeSession saved = practiceSessionRepository.save(session);
        log.info("Started practice session {} for user {} on bucket {}", saved.getId(), userId, bucket);

        return new StartPracticeSessionResponse(
                saved.getId(),
                saved.getUserId(),
                saved.getBucket(),
                saved.getStatus(),
                saved.getCreatedAt()
        );
    }

    @Transactional
    public DrillAttemptResponse submitDrillAttempt(
            UUID practiceSessionId,
            String targetText,
            Integer attemptNumber,
            MultipartFile audioFile
    ) {
        if (targetText == null || targetText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target text is required");
        }
        if (audioFile == null || audioFile.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Audio file is required");
        }

        PracticeSession session = practiceSessionRepository.findById(practiceSessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Practice session not found"));

        int attemptNum = (attemptNumber != null && attemptNumber >= 1) ? attemptNumber : 1;

        // 1. Call ml-audio synchronously for Whisper transcription
        String transcribedText;
        try {
            transcribedText = callMlAudioTranscribe(audioFile);
        } catch (Exception e) {
            log.error("Failed to reach ml-audio at {}: {}", mlAudioUrl, e.getMessage(), e);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Audio analysis service is currently unavailable. Please try again."
            );
        }

        // 2. Compute deterministic Word Error Rate (WER)
        double wer = computeWer(targetText, transcribedText);
        boolean isMatch = wer <= WER_THRESHOLD;

        log.info("Drill attempt for session {}: target='{}', transcribed='{}', wer={}, isMatch={}",
                practiceSessionId, targetText, transcribedText, String.format("%.4f", wer), isMatch);

        // 3. Persist attempt record
        DrillAttempt attempt = DrillAttempt.builder()
                .practiceSessionId(session.getId())
                .targetText(targetText.trim())
                .transcribedText(transcribedText)
                .isMatch(isMatch)
                .attemptNumber(attemptNum)
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();

        DrillAttempt saved = drillAttemptRepository.save(attempt);

        return new DrillAttemptResponse(
                saved.getId(),
                saved.getPracticeSessionId(),
                saved.getTargetText(),
                saved.getTranscribedText(),
                saved.getIsMatch(),
                wer,
                saved.getAttemptNumber(),
                saved.getCreatedAt()
        );
    }

    @Transactional
    public CompletePracticeSessionResponse completePracticeSession(UUID practiceSessionId) {
        PracticeSession session = practiceSessionRepository.findById(practiceSessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Practice session not found"));

        session.setStatus("completed");
        session.setCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        PracticeSession saved = practiceSessionRepository.save(session);
        log.info("Completed practice session {}", saved.getId());

        return new CompletePracticeSessionResponse(
                saved.getId(),
                saved.getStatus(),
                saved.getCompletedAt()
        );
    }

    private String callMlAudioTranscribe(MultipartFile audioFile) throws Exception {
        String endpoint = mlAudioUrl + "/analyze/audio";
        String boundary = "---CadencePracticeBoundary" + System.currentTimeMillis();

        String filename = audioFile.getOriginalFilename() != null ? audioFile.getOriginalFilename() : "drill.webm";
        String contentType = audioFile.getContentType() != null ? audioFile.getContentType() : "audio/webm";
        byte[] fileBytes = audioFile.getBytes();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        baos.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        baos.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n").getBytes(StandardCharsets.UTF_8));
        baos.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        baos.write(fileBytes);
        baos.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));

        byte[] multipartPayload = baos.toByteArray();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(multipartPayload))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("ml-audio returned HTTP " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        return root.path("transcription").asText("").trim();
    }

    /**
     * Levenshtein-based Word Error Rate (WER) computation.
     */
    public static double computeWer(String targetText, String transcribedText) {
        String cleanTarget = normalizeText(targetText);
        String cleanTranscribed = normalizeText(transcribedText);

        if (cleanTarget.isEmpty() && cleanTranscribed.isEmpty()) {
            return 0.0;
        }
        if (cleanTarget.isEmpty()) {
            return 1.0;
        }

        String[] ref = cleanTarget.split("\\s+");
        String[] hyp = cleanTranscribed.isEmpty() ? new String[0] : cleanTranscribed.split("\\s+");

        int[][] dp = new int[ref.length + 1][hyp.length + 1];

        for (int i = 0; i <= ref.length; i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= hyp.length; j++) {
            dp[0][j] = j;
        }

        for (int i = 1; i <= ref.length; i++) {
            for (int j = 1; j <= hyp.length; j++) {
                if (ref[i - 1].equalsIgnoreCase(hyp[j - 1])) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    int substitution = dp[i - 1][j - 1] + 1;
                    int deletion = dp[i - 1][j] + 1;
                    int insertion = dp[i][j - 1] + 1;
                    dp[i][j] = Math.min(substitution, Math.min(deletion, insertion));
                }
            }
        }

        return (double) dp[ref.length][hyp.length] / (double) ref.length;
    }

    public static String normalizeText(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase()
                .replaceAll("\\b0\\b", "zero")
                .replaceAll("\\b1st\\b", "first")
                .replaceAll("\\b2nd\\b", "second")
                .replaceAll("\\b3rd\\b", "third")
                .replaceAll("\\b1\\b", "one")
                .replaceAll("\\b2\\b", "two")
                .replaceAll("\\b3\\b", "three")
                .replaceAll("\\b4\\b", "four")
                .replaceAll("\\b5\\b", "five")
                .replaceAll("\\b6\\b", "six")
                .replaceAll("\\b7\\b", "seven")
                .replaceAll("\\b8\\b", "eight")
                .replaceAll("\\b9\\b", "nine")
                .replaceAll("\\b10\\b", "ten")
                .replaceAll("\\b20\\b", "twenty")
                .replaceAll("\\b30\\b", "thirty")
                .replaceAll("\\b40\\b", "forty")
                .replaceAll("\\b50\\b", "fifty")
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
