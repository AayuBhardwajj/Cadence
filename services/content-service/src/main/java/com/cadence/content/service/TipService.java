package com.cadence.content.service;

import com.cadence.content.client.LlmClient;
import com.cadence.content.dto.TipResponse;
import com.cadence.content.entity.AssessmentReport;
import com.cadence.content.entity.DailyTip;
import com.cadence.content.entity.Profile;
import com.cadence.content.repository.AssessmentReportRepository;
import com.cadence.content.repository.DailyTipRepository;
import com.cadence.content.repository.ProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class TipService {

    public static final List<String> FREE_TIER_TOPICS = List.of(
            "reducing mother tongue influence on English vowel sounds",
            "controlling speech pace to sound more confident",
            "mastering the 'th' sound (voiced and unvoiced)",
            "eliminating filler words like 'um', 'uh', and 'like'",
            "syllable stress patterns in multi-syllable English words",
            "linking words smoothly in connected speech",
            "reducing retroflex consonants common in Indian English",
            "improving sentence-final intonation to avoid monotone delivery",
            "clear articulation of word-final consonants",
            "differentiating 'v' and 'w' sounds",
            "improving rhythm and natural stress in English sentences",
            "breathing technique for sustained, clear speech",
            "the schwa sound — English's most common vowel",
            "reducing unnecessary retroflex 'd' and 't' sounds",
            "pausing effectively for emphasis instead of rushing",
            "open vs closed vowels — distinguishing 'bit' vs 'beat'",
            "soft 'l' vs hard 'l' — word-final vs word-initial",
            "controlling nasality in speech",
            "practical warmup routines before presentations",
            "eye contact and speech fluency — how they connect"
    );

    private final DailyTipRepository dailyTipRepository;
    private final ProfileRepository profileRepository;
    private final AssessmentReportRepository assessmentReportRepository;
    private final LlmClient llmClient;

    public TipService(
            DailyTipRepository dailyTipRepository,
            ProfileRepository profileRepository,
            AssessmentReportRepository assessmentReportRepository,
            LlmClient llmClient
    ) {
        this.dailyTipRepository = dailyTipRepository;
        this.profileRepository = profileRepository;
        this.assessmentReportRepository = assessmentReportRepository;
        this.llmClient = llmClient;
    }

    public String seedTopicForUser(UUID userId, LocalDate today) {
        String seedString = userId.toString() + ":" + today.toString();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(seedString.getBytes(StandardCharsets.UTF_8));
            long hashInt = 0;
            for (int i = 0; i < 8; i++) {
                hashInt = (hashInt << 8) | (hash[i] & 0xFF);
            }
            int index = Math.abs((int) (hashInt % FREE_TIER_TOPICS.size()));
            return FREE_TIER_TOPICS.get(index);
        } catch (NoSuchAlgorithmException e) {
            int index = Math.abs(seedString.hashCode() % FREE_TIER_TOPICS.size());
            return FREE_TIER_TOPICS.get(index);
        }
    }

    @Transactional
    public TipResponse getTipOfTheDay(String userIdStr) {
        if (userIdStr == null || userIdStr.trim().length() < 10) {
            throw new IllegalArgumentException("Invalid or missing user_id.");
        }

        UUID userId = UUID.fromString(userIdStr.trim());
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // 1. Cache lookup
        Optional<DailyTip> cachedTip = dailyTipRepository.findByUserIdAndTipDate(userId, today);
        if (cachedTip.isPresent()) {
            DailyTip tip = cachedTip.get();
            log.info("Cache hit for user {} on {}", userId, today);
            return TipResponse.builder()
                    .tip(tip.getTipText())
                    .isPersonalized(tip.getIsPersonalized())
                    .generatedAt(tip.getGeneratedAt().toString())
                    .cached(true)
                    .build();
        }

        // 2. Fetch profile tier
        String tier = "FREE";
        Optional<Profile> profileOpt = profileRepository.findById(userId);
        if (profileOpt.isPresent()) {
            tier = profileOpt.get().getTier() != null ? profileOpt.get().getTier() : "FREE";
        }

        boolean isPaid = "PRO".equalsIgnoreCase(tier) || "PREMIUM".equalsIgnoreCase(tier);
        boolean isPersonalized = false;
        String systemPrompt;
        String userPrompt;

        // 3. For paid users: fetch latest assessment focus_areas
        if (isPaid) {
            Optional<AssessmentReport> reportOpt = assessmentReportRepository.findLatestByUserId(userId);
            if (reportOpt.isPresent() && reportOpt.get().getFocusAreas() != null && !reportOpt.get().getFocusAreas().isEmpty()) {
                AssessmentReport report = reportOpt.get();
                List<String> focusAreas = report.getFocusAreas();
                String topWeak = String.join(", ", focusAreas.subList(0, Math.min(3, focusAreas.size())));
                String scoreContext = report.getOverallScore() != null ? "Their most recent fluency score is " + report.getOverallScore() + "/100." : "";

                systemPrompt = "You are a professional speech-language coach helping Indian college students prepare for placement interviews and improve spoken English. Write actionable, encouraging tips in a warm but direct tone. Keep tips to 2–3 sentences max. No markdown, no bullet points.";
                userPrompt = "Give me one specific, practical tip for today to improve my spoken English. My current weak areas are: " + topWeak + ". " + scoreContext + " Focus on the single most impactful thing I can practice today.";
                isPersonalized = true;
            } else {
                String topic = seedTopicForUser(userId, today);
                systemPrompt = "You are a professional speech-language coach helping Indian college students improve their spoken English for placement interviews. Write actionable, encouraging tips in a warm but direct tone. Keep tips to 2–3 sentences max. No markdown, no bullet points. Make the tip feel specific and useful, not generic.";
                userPrompt = "Give me one practical tip for today on this topic: " + topic + ". Be specific — include a small exercise or technique the user can try right now.";
                isPersonalized = false;
            }
        } else {
            String topic = seedTopicForUser(userId, today);
            systemPrompt = "You are a professional speech-language coach helping Indian college students improve their spoken English for placement interviews. Write actionable, encouraging tips in a warm but direct tone. Keep tips to 2–3 sentences max. No markdown, no bullet points. Make the tip feel specific and useful, not generic.";
            userPrompt = "Give me one practical tip for today on this topic: " + topic + ". Be specific — include a small exercise or technique the user can try right now.";
            isPersonalized = false;
        }

        // 4. Call LLM
        String tipText = null;
        try {
            tipText = llmClient.callVolumeTier(userPrompt, systemPrompt, false);
        } catch (Exception e) {
            log.warn("LLM tip generation failed: {}. Using fallback.", e.getMessage());
        }

        if (tipText == null || tipText.isBlank()) {
            String topic = seedTopicForUser(userId, today);
            tipText = "Today's focus: " + topic + ". Record yourself speaking for 60 seconds and listen back — you'll catch patterns you can't hear in the moment.";
        }

        // 5. Cache result
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        DailyTip dailyTip = DailyTip.builder()
                .userId(userId)
                .tipDate(today)
                .tipText(tipText)
                .isPersonalized(isPersonalized)
                .generatedAt(now)
                .build();

        try {
            dailyTipRepository.save(dailyTip);
        } catch (Exception e) {
            log.warn("Failed to cache tip for user {}: {}", userId, e.getMessage());
        }

        return TipResponse.builder()
                .tip(tipText)
                .isPersonalized(isPersonalized)
                .generatedAt(now.toString())
                .cached(false)
                .build();
    }
}
