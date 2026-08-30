package com.cadence.practice.service;

import com.cadence.practice.dto.CompletePracticeSessionResponse;
import com.cadence.practice.dto.DrillAttemptResponse;
import com.cadence.practice.dto.StartPracticeSessionResponse;
import com.cadence.practice.entity.DrillAttempt;
import com.cadence.practice.entity.PracticeSession;
import com.cadence.practice.model.PracticeSessionState;
import com.cadence.practice.repository.DrillAttemptRepository;
import com.cadence.practice.repository.PracticeSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class PracticeService {

    /**
     * Tunable WER (Word Error Rate) threshold for drill match gating.
     * Values <= 0.15 are considered successful phonetic matches.
     */
    public static final double WER_THRESHOLD = 0.15;
    public static final Duration SESSION_STATE_TTL = Duration.ofMinutes(30);
    private static final String SESSION_KEY_PREFIX = "session:";
    private static final String SESSION_KEY_SUFFIX = ":state";

    private final PracticeSessionRepository practiceSessionRepository;
    private final DrillAttemptRepository drillAttemptRepository;
    private final StringRedisTemplate redisTemplate;
    private final String mlAudioUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public PracticeService(
            PracticeSessionRepository practiceSessionRepository,
            DrillAttemptRepository drillAttemptRepository,
            StringRedisTemplate redisTemplate,
            @Value("${cadence.ml-audio.url:http://localhost:9001}") String mlAudioUrl,
            ObjectMapper objectMapper
    ) {
        this.practiceSessionRepository = practiceSessionRepository;
        this.drillAttemptRepository = drillAttemptRepository;
        this.redisTemplate = redisTemplate;
        this.mlAudioUrl = mlAudioUrl.replaceAll("/+$", "");
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Start a new practice session:
     * 1. Writes to Postgres inside @Transactional (durable source of truth).
     * 2. Registers Redis write via afterCommit() — fires ONLY after Postgres transaction
     *    has durably committed. A rollback prevents Redis from ever being written.
     */
    @Transactional
    public StartPracticeSessionResponse startPracticeSession(UUID userId, String bucket) {
        if (bucket == null || bucket.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bucket is required");
        }

        // 1. Write to Postgres inside transaction
        PracticeSession session = PracticeSession.builder()
                .userId(userId)
                .bucket(bucket.trim())
                .status("in_progress")
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();

        PracticeSession saved = practiceSessionRepository.save(session);
        log.info("Started practice session {} for user {} on bucket {} (Postgres write enqueued)",
                saved.getId(), userId, bucket);

        // 2. Build state snapshot now (while entity is in scope), but register Redis write
        //    to fire only after the transaction commits. If rollback occurs, afterCommit
        //    is never called and Redis is never touched.
        PracticeSessionState state = PracticeSessionState.builder()
                .sessionId(saved.getId())
                .userId(saved.getUserId())
                .bucket(saved.getBucket())
                .status(saved.getStatus())
                .totalAttempts(0)
                .successfulAttempts(0)
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getCreatedAt())
                .build();

        scheduleRedisUpdateAfterCommit(state);

        return new StartPracticeSessionResponse(
                saved.getId(),
                saved.getUserId(),
                saved.getBucket(),
                saved.getStatus(),
                saved.getCreatedAt()
        );
    }

    /**
     * Submit a drill attempt:
     * 1. Performs Whisper STT and WER computation.
     * 2. Writes Attempt record to Postgres FIRST (durable source of truth).
     * 3. Synchronously updates write-through session state in Redis.
     */
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

        // 3. Write to Postgres FIRST
        DrillAttempt attempt = DrillAttempt.builder()
                .practiceSessionId(session.getId())
                .targetText(targetText.trim())
                .transcribedText(transcribedText)
                .isMatch(isMatch)
                .attemptNumber(attemptNum)
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();

        DrillAttempt saved = drillAttemptRepository.save(attempt);

        // 4. Build state snapshot and schedule Redis update for afterCommit.
        //    The attempt is already saved to Postgres above; count it directly rather
        //    than re-querying (avoids an extra SELECT and is accurate within this tx).
        List<DrillAttempt> allAttempts = drillAttemptRepository.findByPracticeSessionIdOrderByCreatedAtAsc(session.getId());
        int totalAttempts = allAttempts.size();
        int successfulAttempts = (int) allAttempts.stream().filter(a -> Boolean.TRUE.equals(a.getIsMatch())).count();

        PracticeSessionState state = PracticeSessionState.builder()
                .sessionId(session.getId())
                .userId(session.getUserId())
                .bucket(session.getBucket())
                .status(session.getStatus())
                .totalAttempts(totalAttempts)
                .successfulAttempts(successfulAttempts)
                .lastTargetText(saved.getTargetText())
                .lastTranscribedText(saved.getTranscribedText())
                .lastIsMatch(saved.getIsMatch())
                .lastWer(wer)
                .createdAt(session.getCreatedAt())
                .updatedAt(saved.getCreatedAt())
                .completedAt(session.getCompletedAt())
                .build();

        scheduleRedisUpdateAfterCommit(state);

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

    /**
     * Complete a practice session:
     * 1. Writes completed status to Postgres inside @Transactional.
     * 2. Registers Redis update via afterCommit() — fires only after Postgres commits.
     */
    @Transactional
    public CompletePracticeSessionResponse completePracticeSession(UUID practiceSessionId) {
        PracticeSession session = practiceSessionRepository.findById(practiceSessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Practice session not found"));

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        session.setStatus("completed");
        session.setCompletedAt(now);
        PracticeSession saved = practiceSessionRepository.save(session);
        log.info("Completed practice session {} in Postgres (tx pending commit)", saved.getId());

        List<DrillAttempt> allAttempts = drillAttemptRepository.findByPracticeSessionIdOrderByCreatedAtAsc(session.getId());
        int totalAttempts = allAttempts.size();
        int successfulAttempts = (int) allAttempts.stream().filter(a -> Boolean.TRUE.equals(a.getIsMatch())).count();
        DrillAttempt lastAttempt = allAttempts.isEmpty() ? null : allAttempts.get(allAttempts.size() - 1);

        PracticeSessionState state = PracticeSessionState.builder()
                .sessionId(saved.getId())
                .userId(saved.getUserId())
                .bucket(saved.getBucket())
                .status(saved.getStatus())
                .totalAttempts(totalAttempts)
                .successfulAttempts(successfulAttempts)
                .lastTargetText(lastAttempt != null ? lastAttempt.getTargetText() : null)
                .lastTranscribedText(lastAttempt != null ? lastAttempt.getTranscribedText() : null)
                .lastIsMatch(lastAttempt != null ? lastAttempt.getIsMatch() : null)
                .createdAt(saved.getCreatedAt())
                .updatedAt(now)
                .completedAt(saved.getCompletedAt())
                .build();

        scheduleRedisUpdateAfterCommit(state);

        return new CompletePracticeSessionResponse(
                saved.getId(),
                saved.getStatus(),
                saved.getCompletedAt()
        );
    }

    /**
     * Retrieve active session state:
     * Reads from Redis first (sub-millisecond hot loop).
     * Reconstructs from Postgres on cache miss/expiration.
     */
    public PracticeSessionState getSessionState(UUID sessionId) {
        String redisKey = SESSION_KEY_PREFIX + sessionId + SESSION_KEY_SUFFIX;
        try {
            String cachedJson = redisTemplate.opsForValue().get(redisKey);
            if (cachedJson != null && !cachedJson.isBlank()) {
                log.info("Redis CACHE HIT for session state key: {}", redisKey);
                return objectMapper.readValue(cachedJson, PracticeSessionState.class);
            }
        } catch (Exception e) {
            log.warn("Redis read failed for session {}: {}", sessionId, e.getMessage());
        }

        // Cache miss: reconstruct from Postgres and populate Redis
        log.info("Redis CACHE MISS for session state key: {}. Reconstructing from Postgres...", redisKey);
        PracticeSession session = practiceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Practice session not found"));

        List<DrillAttempt> attempts = drillAttemptRepository.findByPracticeSessionIdOrderByCreatedAtAsc(sessionId);
        int totalAttempts = attempts.size();
        int successfulAttempts = (int) attempts.stream().filter(a -> Boolean.TRUE.equals(a.getIsMatch())).count();
        DrillAttempt lastAttempt = attempts.isEmpty() ? null : attempts.get(attempts.size() - 1);

        PracticeSessionState state = PracticeSessionState.builder()
                .sessionId(session.getId())
                .userId(session.getUserId())
                .bucket(session.getBucket())
                .status(session.getStatus())
                .totalAttempts(totalAttempts)
                .successfulAttempts(successfulAttempts)
                .lastTargetText(lastAttempt != null ? lastAttempt.getTargetText() : null)
                .lastTranscribedText(lastAttempt != null ? lastAttempt.getTranscribedText() : null)
                .lastIsMatch(lastAttempt != null ? lastAttempt.getIsMatch() : null)
                .createdAt(session.getCreatedAt())
                .updatedAt(lastAttempt != null ? lastAttempt.getCreatedAt() : session.getCreatedAt())
                .completedAt(session.getCompletedAt())
                .build();

        // Not inside a transaction — write directly (no afterCommit needed here).
        writeToRedis(state);
        return state;
    }

    /**
     * Registers a Redis write to fire in TransactionSynchronization.afterCommit().
     * Spring calls afterCommit() only after the Postgres transaction has durably
     * committed. If the transaction rolls back for any reason, afterCommit is never
     * invoked and Redis is never written — satisfying D19's Postgres-first ordering
     * requirement without relying on log timestamp order as a proxy for commit order.
     */
    private void scheduleRedisUpdateAfterCommit(PracticeSessionState state) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // No active transaction (e.g. called from getSessionState cache-miss path);
            // write directly.
            writeToRedis(state);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                log.info("[afterCommit] Postgres tx committed — now writing Redis state for session {} (status: {}, totalAttempts: {})",
                        state.getSessionId(), state.getStatus(), state.getTotalAttempts());
                writeToRedis(state);
            }
        });
    }

    private void writeToRedis(PracticeSessionState state) {
        String redisKey = SESSION_KEY_PREFIX + state.getSessionId() + SESSION_KEY_SUFFIX;
        try {
            String json = objectMapper.writeValueAsString(state);
            redisTemplate.opsForValue().set(redisKey, json, SESSION_STATE_TTL);
            log.info("Redis write-through updated: {} (status: {}, totalAttempts: {})",
                    redisKey, state.getStatus(), state.getTotalAttempts());
        } catch (Exception e) {
            log.error("Failed to write session state to Redis for key {}: {}", redisKey, e.getMessage(), e);
        }
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
