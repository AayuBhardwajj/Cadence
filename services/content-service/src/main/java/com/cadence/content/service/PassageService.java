package com.cadence.content.service;

import com.cadence.content.client.LlmClient;
import com.cadence.content.entity.GeneratedPassage;
import com.cadence.content.entity.PassagePool;
import com.cadence.content.entity.WordBank;
import com.cadence.content.repository.GeneratedPassageRepository;
import com.cadence.content.repository.PassagePoolRepository;
import com.cadence.content.repository.WordBankRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class PassageService {

    public static final List<String> FIXED_TOPICS = List.of(
            "workplace_communication",
            "technology",
            "social_situations",
            "academic_english",
            "job_interview"
    );

    public static final List<String> DIFFICULTIES = List.of(
            "easy",
            "medium",
            "hard"
    );

    private static final Map<String, String> TOPIC_TO_WORD_BANK_MAP = Map.of(
            "workplace_communication", "business",
            "technology", "tech",
            "social_situations", "general",
            "academic_english", "academics",
            "job_interview", "business"
    );

    private static final Map<String, String> TOPIC_ALIAS_MAP = Map.of(
            "workplace", "workplace_communication",
            "social", "social_situations",
            "academic", "academic_english",
            "interview", "job_interview",
            "tech", "technology"
    );

    private static final Map<String, String> DIFFICULTY_ALIAS = Map.of(
            "easy", "easy",
            "easy-tier", "easy",
            "beginner", "easy",
            "medium", "medium",
            "medium-tier", "medium",
            "intermediate", "medium",
            "hard", "hard",
            "hard-tier", "hard",
            "advanced", "hard"
    );

    private static final Map<String, String> STATIC_TOPIC_PROMPTS = Map.ofEntries(
            Map.entry("workplace", "An ideal workplace reflects values like collaboration, respect, and innovation."),
            Map.entry("workplace_communication", "An ideal workplace reflects values like collaboration, respect, and innovation."),
            Map.entry("tech", "Technology has transformed communication, relationships, education, and work."),
            Map.entry("technology", "Technology has transformed communication, relationships, education, and work."),
            Map.entry("social", "Social media influences friendships, relationships, identity, and self-expression."),
            Map.entry("social_situations", "Social media influences friendships, relationships, identity, and self-expression."),
            Map.entry("academic", "Learning multiple languages improves communication and career opportunities."),
            Map.entry("academic_english", "Learning multiple languages improves communication and career opportunities."),
            Map.entry("interview", "Preparing for an interview requires reflection on career goals and key strengths."),
            Map.entry("job_interview", "Preparing for an interview requires reflection on career goals and key strengths."),
            Map.entry("custom", "Please speak on a topic of your choice.")
    );

    private final WordBankRepository wordBankRepository;
    private final GeneratedPassageRepository generatedPassageRepository;
    private final PassagePoolRepository passagePoolRepository;
    private final LlmClient llmClient;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PassageService(
            WordBankRepository wordBankRepository,
            GeneratedPassageRepository generatedPassageRepository,
            PassagePoolRepository passagePoolRepository,
            LlmClient llmClient,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.wordBankRepository = wordBankRepository;
        this.generatedPassageRepository = generatedPassageRepository;
        this.passagePoolRepository = passagePoolRepository;
        this.llmClient = llmClient;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public String normalizeDifficulty(String difficulty) {
        if (difficulty == null || difficulty.isBlank()) {
            return null;
        }
        return DIFFICULTY_ALIAS.get(difficulty.toLowerCase().trim());
    }

    public String resolveTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            return null;
        }
        String lower = topic.toLowerCase().trim();
        return TOPIC_ALIAS_MAP.getOrDefault(lower, topic);
    }

    public String getTopicPrompt(String topic) {
        if (topic == null || topic.isBlank()) {
            return STATIC_TOPIC_PROMPTS.get("custom");
        }
        String key = topic.toLowerCase().trim();
        return STATIC_TOPIC_PROMPTS.getOrDefault(key, STATIC_TOPIC_PROMPTS.get("custom"));
    }

    @Transactional
    public Map<String, Object> getOrGeneratePassage(
            String topic,
            String difficulty,
            String issueType,
            Integer wordCount,
            String sessionId
    ) {
        int count = (wordCount != null && wordCount >= 1 && wordCount <= 15) ? wordCount : 8;
        String diffNormalized = normalizeDifficulty(difficulty);
        if (diffNormalized == null) {
            diffNormalized = difficulty != null ? difficulty : "medium";
        }
        String resolvedTopic = resolveTopic(topic);

        Map<String, Object> result = null;

        // 1. Try pool claim if combo is fixed
        if (FIXED_TOPICS.contains(resolvedTopic) && DIFFICULTIES.contains(diffNormalized)) {
            try {
                List<PassagePool> claimed = passagePoolRepository.claimPooledPassage(resolvedTopic, diffNormalized);
                if (claimed != null && !claimed.isEmpty()) {
                    PassagePool poolRow = claimed.get(0);
                    Optional<GeneratedPassage> gpOpt = generatedPassageRepository.findById(poolRow.getPassageId());
                    if (gpOpt.isPresent()) {
                        GeneratedPassage gp = gpOpt.get();
                        log.info("Pool HIT: served passage {} for topic={} (resolved={}), difficulty={}",
                                gp.getId(), topic, resolvedTopic, diffNormalized);

                        result = buildResponseMap(gp, topic != null ? topic : resolvedTopic, "pool");
                    }
                }
            } catch (Exception e) {
                log.error("Error claiming passage from pool: {}", e.getMessage(), e);
            }
        }

        // 2. Fallback to live generation if pool claim missed
        if (result == null) {
            log.info("Pool MISS/fallback: live generation for topic={} (resolved={}), difficulty={}",
                    topic, resolvedTopic, diffNormalized);

            GeneratedPassage gp = generatePassage(diffNormalized, resolvedTopic, issueType, count);
            result = buildResponseMap(gp, topic != null ? topic : resolvedTopic, "fallback");

            // Self-seed pool
            if (FIXED_TOPICS.contains(resolvedTopic) && DIFFICULTIES.contains(diffNormalized)) {
                try {
                    PassagePool poolRow = PassagePool.builder()
                            .passageId(gp.getId())
                            .topic(resolvedTopic)
                            .difficulty(diffNormalized)
                            .status("served")
                            .servedAt(OffsetDateTime.now(ZoneOffset.UTC))
                            .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                            .build();
                    passagePoolRepository.save(poolRow);
                } catch (Exception seedErr) {
                    log.error("Failed to self-seed pool for passage {}: {}", gp.getId(), seedErr.getMessage());
                }
            }
        }

        // 3. Link session if provided
        if (sessionId != null && !sessionId.isBlank() && result.get("passage_id") != null) {
            try {
                UUID sessionUuid = UUID.fromString(sessionId.trim());
                UUID passageUuid = UUID.fromString(result.get("passage_id").toString());

                jdbcTemplate.update(
                        "UPDATE public.assessment_sessions SET passage_id = ? WHERE id = ?",
                        passageUuid, sessionUuid
                );
                log.info("Successfully linked passage_id {} to assessment_session {}", passageUuid, sessionUuid);
            } catch (Exception err) {
                log.warn("Failed to write passage_id to assessment_sessions for session {}: {}", sessionId, err.getMessage());
            }
        }

        // 4. Attach topic_prompt
        result.put("topic_prompt", getTopicPrompt(resolvedTopic));
        return result;
    }

    public GeneratedPassage generatePassage(
            String difficulty,
            String topic,
            String issueType,
            int wordCount
    ) {
        String diffClean = normalizeDifficulty(difficulty);
        String targetTopicFit = TOPIC_TO_WORD_BANK_MAP.getOrDefault(topic, topic);

        List<WordBank> words = wordBankRepository.getRandomWords(
                diffClean,
                issueType,
                targetTopicFit,
                wordCount
        );

        // Fallback 1: topic_fit = 'general'
        if ((words == null || words.size() < wordCount) && targetTopicFit != null && !"general".equalsIgnoreCase(targetTopicFit)) {
            List<WordBank> fbWords = wordBankRepository.getRandomWords(
                    diffClean,
                    issueType,
                    "general",
                    wordCount
            );
            if (fbWords != null && (words == null || fbWords.size() > words.size())) {
                words = fbWords;
            }
        }

        // Fallback 2: topic_fit = null (any topic)
        if ((words == null || words.size() < wordCount) && targetTopicFit != null) {
            List<WordBank> anyWords = wordBankRepository.getRandomWords(
                    diffClean,
                    issueType,
                    null,
                    wordCount
            );
            if (anyWords != null && (words == null || anyWords.size() > words.size())) {
                words = anyWords;
            }
        }

        if (words == null || words.isEmpty()) {
            throw new IllegalArgumentException("No matching active and verified words found in word_bank");
        }

        List<String> targetWordStrs = words.stream().map(WordBank::getWord).toList();
        String wordsListStr = String.join(", ", targetWordStrs.stream().map(w -> "'" + w + "'").toList());
        String lengthGuideline = "easy".equalsIgnoreCase(diffClean) ? "60-90 words"
                : "hard".equalsIgnoreCase(diffClean) ? "100-150 words" : "80-120 words";

        String prompt = buildPrompt(lengthGuideline, wordsListStr, diffClean, topic);
        String systemMsg = "You are an expert English speech assessment system. Return ONLY valid JSON — no markdown, no preamble.";

        String passageText = "";
        try {
            String rawOutput = llmClient.callVolumeTier(prompt, systemMsg, true);
            JsonNode root = objectMapper.readTree(rawOutput);
            passageText = root.path("passage").asText("").trim();
        } catch (Exception e) {
            log.error("LLM call failed on attempt 1: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate passage: " + e.getMessage(), e);
        }

        List<Map<String, Object>> foundWords = findWordPositions(passageText, words);

        // Check missing words & retry once
        if (foundWords.size() < words.size()) {
            Set<String> foundSet = new HashSet<>();
            for (Map<String, Object> fw : foundWords) {
                foundSet.add(fw.get("word").toString().toLowerCase());
            }
            List<String> missingWords = words.stream()
                    .map(WordBank::getWord)
                    .filter(w -> !foundSet.contains(w.toLowerCase()))
                    .toList();

            if (!missingWords.isEmpty()) {
                log.info("Target words missing on attempt 1: {}. Retrying with stricter prompt...", missingWords);
                String retryPrompt = buildRetryPrompt(lengthGuideline, wordsListStr, String.join(", ", missingWords));
                try {
                    String rawOutput = llmClient.callVolumeTier(retryPrompt, systemMsg, true);
                    JsonNode root = objectMapper.readTree(rawOutput);
                    passageText = root.path("passage").asText("").trim();
                    foundWords = findWordPositions(passageText, words);
                } catch (Exception e) {
                    log.error("LLM call failed on retry attempt: {}", e.getMessage(), e);
                }
            }
        }

        int actualWordCount = passageText.isBlank() ? 0 : passageText.trim().split("\\s+").length;
        UUID passageId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        String targetWordsJson = "[]";
        try {
            targetWordsJson = objectMapper.writeValueAsString(foundWords);
        } catch (Exception e) {
            log.warn("Failed to serialize foundWords to JSON: {}", e.getMessage());
        }

        GeneratedPassage gp = GeneratedPassage.builder()
                .id(passageId)
                .passageText(passageText)
                .difficulty(diffClean != null ? diffClean : "medium")
                .topic(topic != null ? topic : "general")
                .targetWords(targetWordsJson)
                .wordCount(actualWordCount)
                .generatedAt(now)
                .build();

        return generatedPassageRepository.save(gp);
    }

    private List<Map<String, Object>> findWordPositions(String passageText, List<WordBank> words) {
        List<Map<String, Object>> found = new ArrayList<>();
        if (passageText == null || passageText.isBlank()) {
            return found;
        }

        for (WordBank w : words) {
            String wordStr = w.getWord();
            Pattern pattern = Pattern.compile("(?<!\\w)" + Pattern.quote(wordStr) + "(?!\\w)", Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(passageText);
            if (matcher.find()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("word_code", w.getWordCode());
                item.put("word", w.getWord());
                item.put("issue_type", w.getIssueType());
                item.put("bucket", w.getBucket());
                item.put("char_start", matcher.start());
                item.put("char_end", matcher.end());
                found.add(item);
            }
        }
        return found;
    }

    private String buildPrompt(String lengthGuideline, String wordsListStr, String difficulty, String topic) {
        return """
                You are an expert English speech therapist and linguist.\s
                Write a single coherent reading passage of approximately %s that naturally embeds ALL of the following target words/phrases verbatim:
                %s
                
                Difficulty level of words: %s
                Topic of passage: %s
                
                Strictest Rules:
                1. You MUST include every target word/phrase exactly as listed. Do NOT conjugate, change tense, pluralize, or paraphrase them. They must appear verbatim.
                2. The passage must flow naturally and read like coherent speech for a speech assessment, not like a random list of words.
                3. Return ONLY a valid JSON object matching the JSON schema below.
                4. Do NOT include any markdown formatting (like ```json or ```).
                5. Do NOT include any conversational preamble or trailing explanation.
                
                JSON Schema:
                {
                    "passage": "string"
                }
                """.formatted(lengthGuideline, wordsListStr, difficulty != null ? difficulty : "mixed", topic != null ? topic : "general");
    }

    private String buildRetryPrompt(String lengthGuideline, String wordsListStr, String missingStr) {
        return """
                You previously generated a passage, but it did NOT contain the following target words/phrases verbatim:
                %s
                
                Please generate a NEW single coherent reading passage of approximately %s that strictly and verbatim embeds ALL of the originally requested target words/phrases:
                %s
                
                Strictest Rules:
                1. You MUST include every target word/phrase exactly as listed, including the missing ones: %s. Do NOT conjugate, change tense, pluralize, or paraphrase them.
                2. Return ONLY a valid JSON object matching the JSON schema below.
                3. Do NOT include any markdown formatting (like ```json or ```).
                4. Do NOT include any conversational preamble or trailing explanation.
                
                JSON Schema:
                {
                    "passage": "string"
                }
                """.formatted(missingStr, lengthGuideline, wordsListStr, missingStr);
    }

    private Map<String, Object> buildResponseMap(GeneratedPassage gp, String topic, String source) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("passage_id", gp.getId().toString());
        res.put("passage_text", gp.getPassageText());
        res.put("difficulty", gp.getDifficulty());
        res.put("topic", topic);
        res.put("target_words", gp.getTargetWords());
        res.put("generated_at", gp.getGeneratedAt() != null ? gp.getGeneratedAt().toString() : null);
        res.put("source", source);
        return res;
    }
}
