package com.cadence.content.service;

import com.cadence.content.client.LlmClient;
import com.cadence.content.entity.GeneratedPassage;
import com.cadence.content.entity.PassagePool;
import com.cadence.content.entity.WordBank;
import com.cadence.content.repository.GeneratedPassageRepository;
import com.cadence.content.repository.PassagePoolRepository;
import com.cadence.content.repository.WordBankRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PassageServiceTest {

    private WordBankRepository wordBankRepository;
    private GeneratedPassageRepository generatedPassageRepository;
    private PassagePoolRepository passagePoolRepository;
    private LlmClient llmClient;
    private JdbcTemplate jdbcTemplate;
    private ObjectMapper objectMapper;
    private PassageService passageService;

    @BeforeEach
    void setUp() {
        wordBankRepository = mock(WordBankRepository.class);
        generatedPassageRepository = mock(GeneratedPassageRepository.class);
        passagePoolRepository = mock(PassagePoolRepository.class);
        llmClient = mock(LlmClient.class);
        jdbcTemplate = mock(JdbcTemplate.class);
        objectMapper = new ObjectMapper();

        passageService = new PassageService(
                wordBankRepository,
                generatedPassageRepository,
                passagePoolRepository,
                llmClient,
                jdbcTemplate,
                objectMapper
        );
    }

    @Test
    void testNormalizersAndResolvers() {
        assertEquals("easy", passageService.normalizeDifficulty("beginner"));
        assertEquals("medium", passageService.normalizeDifficulty("intermediate"));
        assertEquals("hard", passageService.normalizeDifficulty("advanced"));
        assertNull(passageService.normalizeDifficulty(null));

        assertEquals("workplace_communication", passageService.resolveTopic("workplace"));
        assertEquals("job_interview", passageService.resolveTopic("interview"));
        assertEquals("technology", passageService.resolveTopic("tech"));

        assertNotNull(passageService.getTopicPrompt("workplace"));
        assertNotNull(passageService.getTopicPrompt("custom"));
    }

    @Test
    void testPoolHitReturnsPoolSource() {
        UUID passageId = UUID.randomUUID();
        PassagePool poolRow = PassagePool.builder()
                .passageId(passageId)
                .topic("workplace_communication")
                .difficulty("medium")
                .status("available")
                .build();

        GeneratedPassage gp = GeneratedPassage.builder()
                .id(passageId)
                .passageText("This is an ideal workplace passage.")
                .difficulty("medium")
                .topic("workplace_communication")
                .targetWords("[]")
                .generatedAt(OffsetDateTime.now())
                .build();

        when(passagePoolRepository.claimPooledPassage("workplace_communication", "medium"))
                .thenReturn(List.of(poolRow));
        when(generatedPassageRepository.findById(passageId))
                .thenReturn(Optional.of(gp));

        Map<String, Object> response = passageService.getOrGeneratePassage("workplace", "intermediate", null, 8, null);

        assertNotNull(response);
        assertEquals("pool", response.get("source"));
        assertEquals("This is an ideal workplace passage.", response.get("passage_text"));
        verify(llmClient, never()).callVolumeTier(anyString(), anyString(), anyBoolean());
    }

    @Test
    void testPoolMissTriggersFallbackGenerationAndSelfSeeding() {
        when(passagePoolRepository.claimPooledPassage("workplace_communication", "medium"))
                .thenReturn(Collections.emptyList());

        WordBank wb = WordBank.builder()
                .wordCode("W1")
                .word("collaboration")
                .issueType("mti")
                .bucket("business")
                .active(true)
                .build();

        when(wordBankRepository.getRandomWords(eq("medium"), any(), any(), anyInt()))
                .thenReturn(List.of(wb));

        when(llmClient.callVolumeTier(anyString(), anyString(), eq(true)))
                .thenReturn("{\"passage\": \"An ideal workplace reflects collaboration and respect.\"}");

        UUID generatedId = UUID.randomUUID();
        when(generatedPassageRepository.save(any(GeneratedPassage.class)))
                .thenAnswer(invocation -> {
                    GeneratedPassage p = invocation.getArgument(0);
                    p.setId(generatedId);
                    return p;
                });

        Map<String, Object> response = passageService.getOrGeneratePassage("workplace", "intermediate", null, 8, null);

        assertNotNull(response);
        assertEquals("fallback", response.get("source"));
        assertTrue(response.get("passage_text").toString().contains("collaboration"));
        verify(passagePoolRepository, times(1)).save(any(PassagePool.class));
    }

    @Test
    void testSessionLinkageWhenSessionIdProvided() {
        UUID passageId = UUID.randomUUID();
        PassagePool poolRow = PassagePool.builder()
                .passageId(passageId)
                .topic("workplace_communication")
                .difficulty("medium")
                .build();

        GeneratedPassage gp = GeneratedPassage.builder()
                .id(passageId)
                .passageText("Passage text")
                .difficulty("medium")
                .topic("workplace_communication")
                .build();

        when(passagePoolRepository.claimPooledPassage(anyString(), anyString()))
                .thenReturn(List.of(poolRow));
        when(generatedPassageRepository.findById(passageId))
                .thenReturn(Optional.of(gp));

        UUID sessionId = UUID.randomUUID();
        passageService.getOrGeneratePassage("workplace", "medium", null, 8, sessionId.toString());

        verify(jdbcTemplate, times(1)).update(
                eq("UPDATE public.assessment_sessions SET passage_id = ? WHERE id = ?"),
                eq(passageId),
                eq(sessionId)
        );
    }
}
