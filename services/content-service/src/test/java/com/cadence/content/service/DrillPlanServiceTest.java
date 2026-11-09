package com.cadence.content.service;

import com.cadence.content.dto.DrillPlanDto;
import com.cadence.content.dto.DrillPlanItemDto;
import com.cadence.content.entity.*;
import com.cadence.content.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DrillPlanServiceTest {

    @Mock
    private AssessmentReportRepository assessmentReportRepository;

    @Mock
    private WordBankRepository wordBankRepository;

    @Mock
    private DrillPhraseRepository drillPhraseRepository;

    @Mock
    private UserDrillPlanRepository userDrillPlanRepository;

    @Mock
    private UserDrillPlanItemRepository userDrillPlanItemRepository;

    private DrillPlanService drillPlanService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        drillPlanService = new DrillPlanService(
                assessmentReportRepository,
                wordBankRepository,
                drillPhraseRepository,
                userDrillPlanRepository,
                userDrillPlanItemRepository
        );
    }

    @Test
    @DisplayName("Ranking and tie-break: targets ranked by count DESC, target_value ASC; trigger word selected")
    void testRankingAndTieBreak() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        // Target 'k': 3 errors ('kashmir', 'kashmir', 'comb')
        errorLog.add(createError("Fluency", "repetition", "kashmir", false));
        errorLog.add(createError("Fluency", "prolongation", "kashmir", false));
        errorLog.add(createError("Fluency", "prolongation", "comb", false));

        // Target 'n': 3 errors ('knife', 'knowledge', 'knife') -> count 3, tied with 'k'
        errorLog.add(createError("Fluency", "repetition", "knife", false));
        errorLog.add(createError("Fluency", "prolongation", "knowledge", false));
        errorLog.add(createError("Fluency", "repetition", "knife", false));

        // Target 's': 1 error ('psychology') -> count 1
        errorLog.add(createError("Fluency", "prolongation", "psychology", false));

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .amcatErrorLog(errorLog)
                .build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(invocation -> {
            UserDrillPlan plan = invocation.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto).isNotNull();
        assertThat(planDto.getStatus()).isEqualTo("active");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> targets = (List<Map<String, Object>>) planDto.getGenerationSummary().get("targets");
        assertThat(targets).hasSize(3);

        // 'k' and 'n' have count 3; alphabetical tie-break puts 'k' before 'n'
        assertThat(targets.get(0).get("value")).isEqualTo("k");
        assertThat(targets.get(0).get("count")).isEqualTo(3);
        assertThat(targets.get(0).get("trigger_word")).isEqualTo("kashmir");

        assertThat(targets.get(1).get("value")).isEqualTo("n");
        assertThat(targets.get(1).get("count")).isEqualTo(3);
        assertThat(targets.get(1).get("trigger_word")).isEqualTo("knife");

        assertThat(targets.get(2).get("value")).isEqualTo("s");
        assertThat(targets.get(2).get("count")).isEqualTo(1);
    }

    @Test
    @DisplayName("Block and insertion errors are strictly ignored (never attributed to words)")
    void testBlockAndInsertionIgnored() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Fluency", "block", "touch", false));
        errorLog.add(createError("Fluency", "insertion", "little", false));
        errorLog.add(createError("Fluency", "large_omission", "sentence", false));

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .amcatErrorLog(errorLog)
                .build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getStatus()).isEqualTo("no_targets");
        verify(userDrillPlanRepository, never()).save(any());
    }

    @Test
    @DisplayName("MTI substitution / deletion matches active word_bank row to extract bucket target")
    void testMtiSubstitutionToBucketTarget() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Vocabulary", "substitution", "thirty", false));
        errorLog.add(createError("Vocabulary", "deletion", "thirty", false));

        WordBank wb = WordBank.builder()
                .word("thirty")
                .bucket("th_sound")
                .issueType("mti")
                .active(true)
                .build();
        when(wordBankRepository.findFirstByWordIgnoreCaseAndActiveTrueAndIssueType("thirty", "mti"))
                .thenReturn(Optional.of(wb));

        DrillPhrase curated = DrillPhrase.builder()
                .id(UUID.randomUUID())
                .bucket("th_sound")
                .level((short) 2)
                .phraseText("Three thin thieves thought through thirty things")
                .source("curated")
                .active(true)
                .build();
        when(drillPhraseRepository.findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc("th_sound", (short) 2))
                .thenReturn(List.of(curated));
        when(drillPhraseRepository.findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc("th_sound", (short) 3))
                .thenReturn(Collections.emptyList());

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .amcatErrorLog(errorLog)
                .build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(invocation -> {
            UserDrillPlan plan = invocation.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getStatus()).isEqualTo("active");
        assertThat(planDto.getItems()).hasSize(2); // 1 carrier + 1 pool phrase

        DrillPlanItemDto carrierItem = planDto.getItems().get(0);
        assertThat(carrierItem.getLevel()).isEqualTo((short) 1);
        assertThat(carrierItem.getTargetKind()).isEqualTo("bucket");
        assertThat(carrierItem.getTargetValue()).isEqualTo("th_sound");
        assertThat(carrierItem.getTriggerWord()).isEqualTo("thirty");
        assertThat(carrierItem.getPhraseSource()).isEqualTo("carrier");

        DrillPlanItemDto poolItem = planDto.getItems().get(1);
        assertThat(poolItem.getLevel()).isEqualTo((short) 2);
        assertThat(poolItem.getTargetKind()).isEqualTo("bucket");
        assertThat(poolItem.getTargetValue()).isEqualTo("th_sound");
        assertThat(poolItem.getPhraseSource()).isEqualTo("curated");
    }

    @Test
    @DisplayName("No targets persists nothing and returns status 'no_targets'")
    void testNoTargetsPersistsNothing() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        // Report without error log
        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .amcatErrorLog(objectMapper.createArrayNode())
                .build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getStatus()).isEqualTo("no_targets");
        verify(userDrillPlanRepository, never()).save(any());
    }

    @Test
    @DisplayName("Second call returns the identical plan without re-generating")
    void testSecondCallReturnsIdenticalPlan() {
        UUID userId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();

        UserDrillPlan existingPlan = UserDrillPlan.builder()
                .id(planId)
                .userId(userId)
                .sourceReportId(UUID.randomUUID())
                .status("active")
                .generationSummary(Map.of("note", "original"))
                .items(new ArrayList<>())
                .build();

        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.of(existingPlan));

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getId()).isEqualTo(planId);
        verify(assessmentReportRepository, never()).findLatestByUserId(any());
        verify(userDrillPlanRepository, never()).save(any());
    }

    @Test
    @DisplayName("Unique-violation path: handles concurrent insert collision and returns existing plan")
    void testUniqueViolationCollisionReturnsExistingPlan() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Fluency", "repetition", "kashmir", false));

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .amcatErrorLog(errorLog)
                .build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        // First call to save throws DataIntegrityViolationException (duplicate key)
        when(userDrillPlanRepository.save(any(UserDrillPlan.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        UUID existingPlanId = UUID.randomUUID();
        UserDrillPlan existingPlan = UserDrillPlan.builder()
                .id(existingPlanId)
                .userId(userId)
                .sourceReportId(report.getId())
                .status("active")
                .items(new ArrayList<>())
                .build();

        // Fallback findByUserId returns the winning plan
        when(userDrillPlanRepository.findByUserId(userId))
                .thenReturn(Optional.empty()) // first check
                .thenReturn(Optional.of(existingPlan)); // collision recovery check

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getId()).isEqualTo(existingPlanId);
    }

    @Test
    @DisplayName("Complete endpoint owner check: sets completed_at for owner, forbids non-owner")
    void testCompleteEndpointOwnerCheck() {
        UUID ownerId = UUID.randomUUID();
        UUID nonOwnerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        UserDrillPlan plan = UserDrillPlan.builder()
                .id(UUID.randomUUID())
                .userId(ownerId)
                .build();

        UserDrillPlanItem item = UserDrillPlanItem.builder()
                .id(itemId)
                .plan(plan)
                .position(1)
                .level((short) 1)
                .targetKind("onset")
                .targetValue("k")
                .phraseText("Please repeat kashmir")
                .phraseSource("carrier")
                .completedAt(null)
                .build();

        when(userDrillPlanItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(userDrillPlanItemRepository.save(any(UserDrillPlanItem.class))).thenAnswer(i -> i.getArgument(0));

        // 1. Non-owner attempt -> 403 Forbidden
        assertThatThrownBy(() -> drillPlanService.completeItem(itemId, nonOwnerId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Forbidden");

        // 2. Owner attempt -> sets completed_at
        DrillPlanItemDto completedDto = drillPlanService.completeItem(itemId, ownerId);
        assertThat(completedDto.getCompletedAt()).isNotNull();

        // 3. Idempotent call -> preserves existing timestamp
        OffsetDateTime firstTimestamp = completedDto.getCompletedAt();
        DrillPlanItemDto secondDto = drillPlanService.completeItem(itemId, ownerId);
        assertThat(secondDto.getCompletedAt()).isEqualTo(firstTimestamp);
    }

    @Test
    @DisplayName("excluded_from_scoring=true entries are strictly ignored even if error_type is qualifying")
    void testExcludedFromScoringIsIgnored() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        // This entry WOULD qualify (fluency/repetition) but excluded_from_scoring=true
        errorLog.add(createError("Fluency", "repetition", "kashmir", true));
        // This entry also excluded
        errorLog.add(createError("Vocabulary", "substitution", "thirty", true));

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .amcatErrorLog(errorLog)
                .build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getStatus()).isEqualTo("no_targets");
        verify(userDrillPlanRepository, never()).save(any());
        // wordBankRepository must never be called — excluded entries skip lookup entirely
        verify(wordBankRepository, never()).findFirstByWordIgnoreCaseAndActiveTrueAndIssueType(any(), any());
    }

    @Test
    @DisplayName("pool_gap is recorded in generation_summary when no pool phrases match for a target")
    void testPoolGapRecordedInSummary() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Fluency", "repetition", "kashmir", false));

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .amcatErrorLog(errorLog)
                .build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        // No pool phrases available for onset 'k' at any level
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc(eq("k"), eq((short) 2)))
                .thenReturn(Collections.emptyList());
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc(eq("k"), eq((short) 3)))
                .thenReturn(Collections.emptyList());

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(invocation -> {
            UserDrillPlan plan = invocation.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getStatus()).isEqualTo("active");

        @SuppressWarnings("unchecked")
        List<Map<String, String>> poolGaps = (List<Map<String, String>>) planDto.getGenerationSummary().get("pool_gaps");
        assertThat(poolGaps).isNotEmpty();
        assertThat(poolGaps.get(0).get("target")).isEqualTo("k");
        assertThat(poolGaps.get(0).get("gap")).isEqualTo("pool_gap");
    }

    private ObjectNode createError(String category, String errorType, String word, boolean excluded) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("category", category);
        node.put("error_type", errorType);
        node.put("word", word);
        node.put("excluded_from_scoring", excluded);
        return node;
    }
}

