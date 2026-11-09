package com.cadence.content.service;

import com.cadence.content.dto.DrillPlanDto;
import com.cadence.content.dto.DrillPlanItemDto;
import com.cadence.content.entity.*;
import com.cadence.content.repository.*;
import com.cadence.content.util.OnsetResolver;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DrillPlanService {

    private static final List<String> CARRIER_TEMPLATES = List.of(
            "Please repeat the word %s clearly and steadily.",
            "Focus on saying %s with a smooth and relaxed tone.",
            "Practice pronouncing %s with even pace."
    );

    private final AssessmentReportRepository assessmentReportRepository;
    private final WordBankRepository wordBankRepository;
    private final DrillPhraseRepository drillPhraseRepository;
    private final UserDrillPlanRepository userDrillPlanRepository;
    private final UserDrillPlanItemRepository userDrillPlanItemRepository;

    /**
     * Idempotently get or create a personalized drill plan for the authenticated user.
     * Concurrency: single transaction for plan+items; on unique constraint collision
     * returns the existing plan unchanged (DECISIONS.md D28).
     */
    @Transactional
    public DrillPlanDto getOrCreatePlan(UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User identity is required");
        }

        // 1. Return existing plan if already present (never regenerated)
        Optional<UserDrillPlan> existingOpt = userDrillPlanRepository.findByUserId(userId);
        if (existingOpt.isPresent()) {
            return toDto(existingOpt.get());
        }

        // 2. Fetch latest assessment report
        Optional<AssessmentReport> reportOpt = assessmentReportRepository.findLatestByUserId(userId);
        if (reportOpt.isEmpty() || reportOpt.get().getAmcatErrorLog() == null) {
            log.info("No assessment report found for user {}. Returning no_targets status.", userId);
            return DrillPlanDto.builder().status("no_targets").build();
        }

        AssessmentReport report = reportOpt.get();
        JsonNode errorLog = report.getAmcatErrorLog();
        if (!errorLog.isArray() || errorLog.isEmpty()) {
            log.info("Assessment report {} has empty error log. Returning no_targets status.", report.getId());
            return DrillPlanDto.builder().status("no_targets").build();
        }

        // 3. Extract targets and track trigger word frequencies
        Map<TargetKey, TargetStats> targetStatsMap = new HashMap<>();

        for (JsonNode elem : errorLog) {
            if (elem == null || !elem.isObject()) {
                continue;
            }

            // Ignore entries excluded from scoring
            if (elem.has("excluded_from_scoring") && elem.get("excluded_from_scoring").asBoolean()) {
                continue;
            }

            String word = elem.has("word") ? elem.get("word").asText("") : "";
            String category = elem.has("category") ? elem.get("category").asText("") : "";
            String errorType = elem.has("error_type") ? elem.get("error_type").asText("").toLowerCase() : "";

            // Explicitly ignore: block, insertion, large_omission
            if ("block".equals(errorType) || "insertion".equals(errorType) || "large_omission".equals(errorType)) {
                continue;
            }

            // Case A: Fluency repetition / prolongation -> onset target from word
            if ("fluency".equalsIgnoreCase(category) && ("repetition".equals(errorType) || "prolongation".equals(errorType))) {
                Optional<String> onsetOpt = OnsetResolver.resolve(word);
                if (onsetOpt.isPresent()) {
                    TargetKey key = new TargetKey("onset", onsetOpt.get());
                    targetStatsMap.computeIfAbsent(key, k -> new TargetStats(k)).recordWord(word);
                }
            }
            // Case B: Vocabulary substitution / deletion -> check active MTI word_bank match
            else if ("vocabulary".equalsIgnoreCase(category) && ("substitution".equals(errorType) || "deletion".equals(errorType))) {
                String cleanWord = word.trim().toLowerCase().replaceAll("^[^a-z]+|[^a-z]+$", "");
                if (!cleanWord.isEmpty()) {
                    Optional<WordBank> wbOpt = wordBankRepository.findFirstByWordIgnoreCaseAndActiveTrueAndIssueType(cleanWord, "mti");
                    if (wbOpt.isPresent() && wbOpt.get().getBucket() != null) {
                        TargetKey key = new TargetKey("bucket", wbOpt.get().getBucket());
                        targetStatsMap.computeIfAbsent(key, k -> new TargetStats(k)).recordWord(word);
                    }
                }
            }
        }

        if (targetStatsMap.isEmpty()) {
            log.info("Zero qualifying targets extracted for user {}. Returning no_targets.", userId);
            return DrillPlanDto.builder().status("no_targets").build();
        }

        // 4. Rank targets by count DESC, then target_value ASC; keep top 3
        List<TargetStats> rankedTargets = targetStatsMap.values().stream()
                .sorted(Comparator.comparingInt(TargetStats::getCount).reversed()
                        .thenComparing(ts -> ts.getKey().value()))
                .limit(3)
                .toList();

        // 5. Build Drill Plan & Items
        UserDrillPlan plan = UserDrillPlan.builder()
                .userId(userId)
                .sourceReportId(report.getId())
                .status("active")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        List<UserDrillPlanItem> items = new ArrayList<>();
        List<Map<String, String>> poolGaps = new ArrayList<>();
        int positionCounter = 1;
        int carrierIndex = 0;

        for (TargetStats stats : rankedTargets) {
            TargetKey targetKey = stats.getKey();
            String triggerWord = stats.getTriggerWord();

            // Level 1: Carrier sentence using trigger word (skip if non-alphabetic or < 3 chars)
            if (triggerWord != null && triggerWord.matches("^[a-zA-Z]{3,}$")) {
                String template = CARRIER_TEMPLATES.get(carrierIndex % CARRIER_TEMPLATES.size());
                carrierIndex++;
                String phraseText = String.format(template, triggerWord.toLowerCase());

                items.add(UserDrillPlanItem.builder()
                        .plan(plan)
                        .position(positionCounter++)
                        .level((short) 1)
                        .targetKind(targetKey.kind())
                        .targetValue(targetKey.value())
                        .triggerWord(triggerWord.toLowerCase())
                        .phraseText(phraseText)
                        .phraseSource("carrier")
                        .build());
            }

            // Level 2: Up to 2 pool phrases
            List<DrillPhrase> level2Phrases = fetchPoolPhrases(targetKey, (short) 2, 2);
            for (DrillPhrase dp : level2Phrases) {
                items.add(UserDrillPlanItem.builder()
                        .plan(plan)
                        .position(positionCounter++)
                        .level((short) 2)
                        .targetKind(targetKey.kind())
                        .targetValue(targetKey.value())
                        .triggerWord(null)
                        .phraseText(dp.getPhraseText())
                        .phraseSource(dp.getSource())
                        .build());
            }

            // Level 3: Up to 1 pool phrase
            List<DrillPhrase> level3Phrases = fetchPoolPhrases(targetKey, (short) 3, 1);
            for (DrillPhrase dp : level3Phrases) {
                items.add(UserDrillPlanItem.builder()
                        .plan(plan)
                        .position(positionCounter++)
                        .level((short) 3)
                        .targetKind(targetKey.kind())
                        .targetValue(targetKey.value())
                        .triggerWord(null)
                        .phraseText(dp.getPhraseText())
                        .phraseSource(dp.getSource())
                        .build());
            }

            // Track pool gaps
            if (level2Phrases.isEmpty() && level3Phrases.isEmpty()) {
                poolGaps.add(Map.of("target", targetKey.value(), "gap", "pool_gap"));
            }
        }

        Map<String, Object> generationSummary = new HashMap<>();
        generationSummary.put("targets_count", rankedTargets.size());
        generationSummary.put("targets", rankedTargets.stream().map(t -> Map.of(
                "kind", t.getKey().kind(),
                "value", t.getKey().value(),
                "count", t.getCount(),
                "trigger_word", t.getTriggerWord() != null ? t.getTriggerWord() : ""
        )).collect(Collectors.toList()));
        generationSummary.put("pool_gaps", poolGaps);
        generationSummary.put("generated_at", OffsetDateTime.now().toString());

        plan.setGenerationSummary(generationSummary);
        plan.setItems(items);

        try {
            UserDrillPlan saved = userDrillPlanRepository.save(plan);
            return toDto(saved);
        } catch (DataIntegrityViolationException dive) {
            log.info("Concurrent plan generation collision for user {}. Fetching existing plan.", userId);
            return userDrillPlanRepository.findByUserId(userId)
                    .map(this::toDto)
                    .orElseThrow(() -> dive);
        }
    }

    /**
     * Get existing drill plan for user. Throws 404 if none exists.
     */
    @Transactional(readOnly = true)
    public DrillPlanDto getPlan(UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User identity is required");
        }
        return userDrillPlanRepository.findByUserId(userId)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No drill plan found for user"));
    }

    /**
     * Complete a plan item (owner only, idempotent).
     */
    @Transactional
    public DrillPlanItemDto completeItem(UUID itemId, UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User identity is required");
        }

        UserDrillPlanItem item = userDrillPlanItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Drill item not found"));

        if (!item.getPlan().getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden: you do not own this drill plan item");
        }

        if (item.getCompletedAt() == null) {
            item.setCompletedAt(OffsetDateTime.now());
            item = userDrillPlanItemRepository.save(item);
            log.info("Marked drill plan item {} completed for user {}", itemId, userId);
        }

        return toItemDto(item);
    }

    private List<DrillPhrase> fetchPoolPhrases(TargetKey targetKey, Short level, int limit) {
        List<DrillPhrase> matches;
        if ("onset".equals(targetKey.kind())) {
            matches = drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc(targetKey.value(), level);
            // Fallback: th_voiced / th_voiceless have no onset column rows; fall back to bucket=th_sound curated phrases
            if ((matches == null || matches.isEmpty())
                    && ("th_voiced".equals(targetKey.value()) || "th_voiceless".equals(targetKey.value()))) {
                log.debug("No onset-keyed phrases for {}; falling back to bucket=th_sound", targetKey.value());
                matches = drillPhraseRepository.findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc("th_sound", level);
            }
        } else {
            matches = drillPhraseRepository.findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc(targetKey.value(), level);
        }
        if (matches == null || matches.isEmpty()) {
            return Collections.emptyList();
        }
        return matches.stream().limit(limit).toList();
    }

    private DrillPlanDto toDto(UserDrillPlan plan) {
        List<DrillPlanItemDto> itemDtos = plan.getItems() != null
                ? plan.getItems().stream().map(this::toItemDto).toList()
                : Collections.emptyList();

        return DrillPlanDto.builder()
                .id(plan.getId())
                .userId(plan.getUserId())
                .sourceReportId(plan.getSourceReportId())
                .status(plan.getStatus())
                .generationSummary(plan.getGenerationSummary())
                .createdAt(plan.getCreatedAt())
                .items(itemDtos)
                .build();
    }

    private DrillPlanItemDto toItemDto(UserDrillPlanItem item) {
        return DrillPlanItemDto.builder()
                .id(item.getId())
                .planId(item.getPlan() != null ? item.getPlan().getId() : null)
                .position(item.getPosition())
                .level(item.getLevel())
                .targetKind(item.getTargetKind())
                .targetValue(item.getTargetValue())
                .triggerWord(item.getTriggerWord())
                .phraseText(item.getPhraseText())
                .phraseSource(item.getPhraseSource())
                .completedAt(item.getCompletedAt())
                .build();
    }

    public record TargetKey(String kind, String value) {}

    private static class TargetStats {
        private final TargetKey key;
        private int count = 0;
        private final Map<String, Integer> wordFrequencies = new HashMap<>();

        public TargetStats(TargetKey key) {
            this.key = key;
        }

        public void recordWord(String word) {
            this.count++;
            if (word != null && !word.isBlank()) {
                String cleaned = word.trim().toLowerCase();
                wordFrequencies.put(cleaned, wordFrequencies.getOrDefault(cleaned, 0) + 1);
            }
        }

        public TargetKey getKey() {
            return key;
        }

        public int getCount() {
            return count;
        }

        public String getTriggerWord() {
            return wordFrequencies.entrySet().stream()
                    .max(Map.Entry.<String, Integer>comparingByValue()
                            .thenComparing(entry -> -entry.getKey().compareTo("")))
                    .map(Map.Entry::getKey)
                    .orElse(null);
        }
    }
}

