package com.cadence.content;

import com.cadence.content.dto.TipResponse;
import com.cadence.content.entity.*;
import com.cadence.content.repository.*;
import com.cadence.content.service.PassageService;
import com.cadence.content.service.TipService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class ContentServiceApplicationTests {

    @Autowired
    private WordBankRepository wordBankRepository;

    @Autowired
    private GeneratedPassageRepository generatedPassageRepository;

    @Autowired
    private PassagePoolRepository passagePoolRepository;

    @Autowired
    private RefillLockRepository refillLockRepository;

    @Autowired
    private DailyTipRepository dailyTipRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private AssessmentReportRepository assessmentReportRepository;

    @Autowired
    private PassageService passageService;

    @Autowired
    private TipService tipService;

    @Test
    void contextLoads() {
        assertNotNull(wordBankRepository);
        assertNotNull(generatedPassageRepository);
        assertNotNull(passagePoolRepository);
        assertNotNull(refillLockRepository);
        assertNotNull(dailyTipRepository);
        assertNotNull(profileRepository);
        assertNotNull(assessmentReportRepository);
        assertNotNull(passageService);
        assertNotNull(tipService);
    }

    @Test
    void testDailyTipUuidPk() {
        UUID userId = UUID.randomUUID();
        LocalDate today = LocalDate.now();

        DailyTip tip = DailyTip.builder()
                .userId(userId)
                .tipDate(today)
                .tipText("Test daily tip text")
                .isPersonalized(false)
                .generatedAt(OffsetDateTime.now())
                .build();

        DailyTip saved = dailyTipRepository.save(tip);
        assertNotNull(saved.getId());
        assertTrue(dailyTipRepository.findByUserIdAndTipDate(userId, today).isPresent());
        assertEquals("Test daily tip text",
                dailyTipRepository.findByUserIdAndTipDate(userId, today).get().getTipText());
    }

    @Test
    void testRefillLockMapping() {
        RefillLock lock = RefillLock.builder()
                .lockKey(1L)
                .isLocked(false)
                .lockedAt(OffsetDateTime.now())
                .build();

        refillLockRepository.save(lock);
        assertTrue(refillLockRepository.findById(1L).isPresent());
        assertFalse(refillLockRepository.findById(1L).get().getIsLocked());
    }

    @Test
    void testDifficultyAndTopicResolvers() {
        assertEquals("easy", passageService.normalizeDifficulty("beginner"));
        assertEquals("medium", passageService.normalizeDifficulty("intermediate"));
        assertEquals("hard", passageService.normalizeDifficulty("advanced"));

        assertEquals("workplace_communication", passageService.resolveTopic("workplace"));
        assertEquals("job_interview", passageService.resolveTopic("interview"));

        assertNotNull(passageService.getTopicPrompt("workplace"));
    }

    @Test
    void testFreeUserTipSeeding() {
        UUID userId = UUID.randomUUID();
        String topic = tipService.seedTopicForUser(userId, LocalDate.now());
        assertNotNull(topic);
        assertTrue(TipService.FREE_TIER_TOPICS.contains(topic));
    }

    @Test
    void testPaidUserTipWithFocusAreas() {
        UUID userId = UUID.randomUUID();
        profileRepository.save(Profile.builder().id(userId).tier("PRO").build());

        UUID sessionId = UUID.randomUUID();
        assessmentReportRepository.save(AssessmentReport.builder()
                .id(UUID.randomUUID())
                .assessmentSessionId(sessionId)
                .overallScore(75)
                .focusAreas(List.of("Practice complex sentence structures", "Reduce filler words"))
                .createdAt(OffsetDateTime.now())
                .build());

        // Save with UTC date to match TipService.getTipOfTheDay which uses LocalDate.now(ZoneOffset.UTC)
        dailyTipRepository.save(DailyTip.builder()
                .userId(userId)
                .tipDate(LocalDate.now(java.time.ZoneOffset.UTC))
                .tipText("Focus on complex sentences today.")
                .isPersonalized(true)
                .generatedAt(OffsetDateTime.now())
                .build());

        TipResponse response = tipService.getTipOfTheDay(userId.toString());
        assertNotNull(response);
        assertTrue(response.isCached());
        assertEquals("Focus on complex sentences today.", response.getTip());
    }
}
