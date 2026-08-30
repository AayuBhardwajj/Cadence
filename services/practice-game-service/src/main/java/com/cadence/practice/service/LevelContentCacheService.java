package com.cadence.practice.service;

import com.cadence.practice.model.LevelPhrase;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class LevelContentCacheService {

    public static final Duration LEVEL_CONTENT_TTL = Duration.ofHours(24);
    private static final String KEY_PREFIX = "level:";
    private static final String KEY_SUFFIX = ":phrases";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // Static source definitions matching word_bank / drillContent.ts taxonomy
    private static final Map<String, List<LevelPhrase>> LEVEL_STORE = new HashMap<>();

    static {
        LEVEL_STORE.put("th_sound", List.of(
                LevelPhrase.builder()
                        .id("th-1")
                        .bucket("th_sound")
                        .targetText("Three thin thieves thought through thirty things")
                        .focusWords(List.of("three", "thin", "thieves", "thought", "through", "thirty", "things"))
                        .difficulty("medium")
                        .build(),
                LevelPhrase.builder()
                        .id("th-2")
                        .bucket("th_sound")
                        .targetText("I think that the third author wrote with great depth")
                        .focusWords(List.of("think", "that", "the", "third", "author", "with", "depth"))
                        .difficulty("easy")
                        .build(),
                LevelPhrase.builder()
                        .id("th-3")
                        .bucket("th_sound")
                        .targetText("They thought they could thrive through the thermal weather")
                        .focusWords(List.of("they", "thought", "thrive", "through", "thermal", "weather"))
                        .difficulty("medium")
                        .build(),
                LevelPhrase.builder()
                        .id("th-4")
                        .bucket("th_sound")
                        .targetText("The author thanked his mother and brother with warmth")
                        .focusWords(List.of("author", "thanked", "mother", "brother", "with", "warmth"))
                        .difficulty("easy")
                        .build()
        ));

        LEVEL_STORE.put("v_w_mix", List.of(
                LevelPhrase.builder()
                        .id("vw-1")
                        .bucket("v_w_mix")
                        .targetText("Very wary warriors view wicked waves")
                        .focusWords(List.of("very", "wary", "warriors", "view", "wicked", "waves"))
                        .difficulty("medium")
                        .build(),
                LevelPhrase.builder()
                        .id("vw-2")
                        .bucket("v_w_mix")
                        .targetText("Victor viewed various wild wolves wandering west")
                        .focusWords(List.of("victor", "viewed", "various", "wild", "wolves", "wandering", "west"))
                        .difficulty("hard")
                        .build(),
                LevelPhrase.builder()
                        .id("vw-3")
                        .bucket("v_w_mix")
                        .targetText("We visited vibrant villages while winter winds wailed")
                        .focusWords(List.of("visited", "vibrant", "villages", "while", "winter", "winds", "wailed"))
                        .difficulty("hard")
                        .build()
        ));
    }

    /**
     * Read-through cache implementation for level phrases.
     * Checks Redis first. On miss, loads from content repository, caches in Redis for 24h, and returns.
     */
    public List<LevelPhrase> getLevelPhrases(String levelId) {
        if (levelId == null || levelId.isBlank()) {
            return Collections.emptyList();
        }

        String normalizedLevelId = levelId.trim().toLowerCase();
        String redisKey = KEY_PREFIX + normalizedLevelId + KEY_SUFFIX;

        try {
            String cachedJson = redisTemplate.opsForValue().get(redisKey);
            if (cachedJson != null && !cachedJson.isBlank()) {
                log.info("Redis CACHE HIT for level phrases key: {}", redisKey);
                return objectMapper.readValue(cachedJson, new TypeReference<List<LevelPhrase>>() {});
            }
        } catch (Exception e) {
            log.warn("Redis read failed for key {}: {}", redisKey, e.getMessage());
        }

        log.info("Redis CACHE MISS for level phrases key: {}. Loading from source...", redisKey);
        List<LevelPhrase> phrases = LEVEL_STORE.getOrDefault(normalizedLevelId, Collections.emptyList());

        if (!phrases.isEmpty()) {
            try {
                String json = objectMapper.writeValueAsString(phrases);
                redisTemplate.opsForValue().set(redisKey, json, LEVEL_CONTENT_TTL);
                log.info("Populated Redis cache for key: {} (TTL: {} hours)", redisKey, LEVEL_CONTENT_TTL.toHours());
            } catch (Exception e) {
                log.warn("Failed to populate Redis cache for key {}: {}", redisKey, e.getMessage());
            }
        }

        return phrases;
    }
}
