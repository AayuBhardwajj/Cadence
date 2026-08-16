package com.cadence.content.service;

import com.cadence.content.client.LlmClient;
import com.cadence.content.dto.TipResponse;
import com.cadence.content.entity.AssessmentReport;
import com.cadence.content.entity.DailyTip;
import com.cadence.content.entity.Profile;
import com.cadence.content.repository.AssessmentReportRepository;
import com.cadence.content.repository.DailyTipRepository;
import com.cadence.content.repository.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TipServiceTest {

    private DailyTipRepository dailyTipRepository;
    private ProfileRepository profileRepository;
    private AssessmentReportRepository assessmentReportRepository;
    private LlmClient llmClient;
    private TipService tipService;

    @BeforeEach
    void setUp() {
        dailyTipRepository = mock(DailyTipRepository.class);
        profileRepository = mock(ProfileRepository.class);
        assessmentReportRepository = mock(AssessmentReportRepository.class);
        llmClient = mock(LlmClient.class);

        tipService = new TipService(
                dailyTipRepository,
                profileRepository,
                assessmentReportRepository,
                llmClient
        );
    }

    @Test
    void testCacheHitReturnsCachedTip() {
        UUID userId = UUID.randomUUID();
        DailyTip cached = DailyTip.builder()
                .userId(userId)
                .tipDate(LocalDate.now())
                .tipText("Cached tip text")
                .isPersonalized(false)
                .generatedAt(OffsetDateTime.now())
                .build();

        when(dailyTipRepository.findByUserIdAndTipDate(eq(userId), any(LocalDate.class)))
                .thenReturn(Optional.of(cached));

        TipResponse response = tipService.getTipOfTheDay(userId.toString());

        assertNotNull(response);
        assertTrue(response.isCached());
        assertEquals("Cached tip text", response.getTip());
        verify(llmClient, never()).callVolumeTier(anyString(), anyString(), anyBoolean());
    }

    @Test
    void testFreeUserGeneratesGenericTip() {
        UUID userId = UUID.randomUUID();
        when(dailyTipRepository.findByUserIdAndTipDate(any(), any()))
                .thenReturn(Optional.empty());
        when(profileRepository.findById(userId))
                .thenReturn(Optional.of(Profile.builder().id(userId).tier("FREE").build()));

        when(llmClient.callVolumeTier(anyString(), anyString(), eq(false)))
                .thenReturn("Practice pausing for emphasis.");

        TipResponse response = tipService.getTipOfTheDay(userId.toString());

        assertNotNull(response);
        assertFalse(response.isCached());
        assertFalse(response.isPersonalized());
        assertEquals("Practice pausing for emphasis.", response.getTip());
        verify(dailyTipRepository, times(1)).save(any(DailyTip.class));
    }

    @Test
    void testProUserReadsFocusAreasForPersonalizedTip() {
        UUID userId = UUID.randomUUID();
        when(dailyTipRepository.findByUserIdAndTipDate(any(), any()))
                .thenReturn(Optional.empty());
        when(profileRepository.findById(userId))
                .thenReturn(Optional.of(Profile.builder().id(userId).tier("PRO").build()));

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .assessmentSessionId(UUID.randomUUID())
                .overallScore(72)
                .focusAreas(List.of("Reduce filler words", "Improve intonation"))
                .createdAt(OffsetDateTime.now())
                .build();

        when(assessmentReportRepository.findLatestByUserId(userId))
                .thenReturn(Optional.of(report));

        when(llmClient.callVolumeTier(contains("Reduce filler words"), anyString(), eq(false)))
                .thenReturn("Focus on pausing instead of saying um.");

        TipResponse response = tipService.getTipOfTheDay(userId.toString());

        assertNotNull(response);
        assertFalse(response.isCached());
        assertTrue(response.isPersonalized());
        assertEquals("Focus on pausing instead of saying um.", response.getTip());
    }

    @Test
    void testLlmFailureFallsBackToTopicTip() {
        UUID userId = UUID.randomUUID();
        when(dailyTipRepository.findByUserIdAndTipDate(any(), any()))
                .thenReturn(Optional.empty());
        when(profileRepository.findById(userId))
                .thenReturn(Optional.of(Profile.builder().id(userId).tier("FREE").build()));

        when(llmClient.callVolumeTier(anyString(), anyString(), eq(false)))
                .thenThrow(new RuntimeException("Groq TPM exceeded"));

        TipResponse response = tipService.getTipOfTheDay(userId.toString());

        assertNotNull(response);
        assertFalse(response.isCached());
        assertTrue(response.getTip().contains("Record yourself speaking for 60 seconds"));
    }
}
