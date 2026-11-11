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
        // 1 report-derived word ("thirty") + 1 curated pool phrase (carrier removed: See DECISIONS D29)
        assertThat(planDto.getItems()).hasSize(2);

        DrillPlanItemDto wordItem = planDto.getItems().get(0);
        assertThat(wordItem.getLevel()).isEqualTo((short) 1);
        assertThat(wordItem.getTargetKind()).isEqualTo("bucket");
        assertThat(wordItem.getTargetValue()).isEqualTo("th_sound");
        assertThat(wordItem.getPhraseText()).isEqualTo("thirty");
        assertThat(wordItem.getPhraseSource()).isEqualTo("word");
        assertThat(wordItem.getFromReport()).isTrue();
        assertThat(wordItem.getAttempts()).isEqualTo(0);
        assertThat(wordItem.getPassedAttempts()).isEqualTo(0);

        // Carrier item removed: See DECISIONS D29
        /*
        DrillPlanItemDto carrierItem = planDto.getItems().get(1);
        assertThat(carrierItem.getLevel()).isEqualTo((short) 1);
        assertThat(carrierItem.getTargetKind()).isEqualTo("bucket");
        assertThat(carrierItem.getTargetValue()).isEqualTo("th_sound");
        assertThat(carrierItem.getTriggerWord()).isEqualTo("thirty");
        assertThat(carrierItem.getPhraseSource()).isEqualTo("carrier");
        assertThat(carrierItem.getFromReport()).isFalse();
        */

        DrillPlanItemDto poolItem = planDto.getItems().get(1);
        assertThat(poolItem.getLevel()).isEqualTo((short) 2);
        assertThat(poolItem.getTargetKind()).isEqualTo("bucket");
        assertThat(poolItem.getTargetValue()).isEqualTo("th_sound");
        assertThat(poolItem.getPhraseSource()).isEqualTo("curated");
        assertThat(poolItem.getFromReport()).isFalse();
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

    @Test
    @DisplayName("Supplementary words are marked from_report=false and phrase_source='word_bank'")
    void testSupplementaryWordsMarkedCorrectly() {
        // Supplementary word items removed: See DECISIONS D29
        /*
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Vocabulary", "substitution", "thirty", false));

        WordBank wbReport = WordBank.builder()
                .word("thirty")
                .bucket("th_sound")
                .issueType("mti")
                .active(true)
                .build();
        when(wordBankRepository.findFirstByWordIgnoreCaseAndActiveTrueAndIssueType("thirty", "mti"))
                .thenReturn(Optional.of(wbReport));

        // Supplementary word in word_bank for bucket th_sound
        WordBank wbSupplementary = WordBank.builder()
                .word("theater")
                .bucket("th_sound")
                .issueType("mti")
                .active(true)
                .build();
        when(wordBankRepository.findByBucketAndActiveTrue("th_sound"))
                .thenReturn(List.of(wbReport, wbSupplementary));

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
        List<DrillPlanItemDto> items = planDto.getItems();

        // Find supplementary word item
        Optional<DrillPlanItemDto> supItemOpt = items.stream()
                .filter(i -> "theater".equals(i.getPhraseText()))
                .findFirst();

        assertThat(supItemOpt).isPresent();
        DrillPlanItemDto supItem = supItemOpt.get();
        assertThat(supItem.getFromReport()).isFalse();
        assertThat(supItem.getPhraseSource()).isEqualTo("word_bank");
        assertThat(supItem.getLevel()).isEqualTo((short) 1);
        assertThat(supItem.getTargetValue()).isEqualTo("th_sound");
        */
    }

    @Test
    @DisplayName("Plan composition: L1 max 2 error words, L2 up to 3 pool phrases, L3 up to 2 pool phrases (See DECISIONS D29)")
    void testPlanCompositionNewCounts() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        // 3 distinct error words for onset 'k': 'kashmir' (2), 'comb' (2), 'kitchen' (1)
        errorLog.add(createError("Fluency", "repetition", "kashmir", false));
        errorLog.add(createError("Fluency", "prolongation", "kashmir", false));
        errorLog.add(createError("Fluency", "repetition", "comb", false));
        errorLog.add(createError("Fluency", "prolongation", "comb", false));
        errorLog.add(createError("Fluency", "repetition", "kitchen", false));

        AssessmentReport report = AssessmentReport.builder()
                .id(UUID.randomUUID())
                .amcatErrorLog(errorLog)
                .build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        // Pool: 4 level 2 phrases, 3 level 3 phrases
        List<DrillPhrase> l2Pool = List.of(
                DrillPhrase.builder().id(UUID.randomUUID()).onset("k").level((short) 2).phraseText("L2 Phrase 1").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.randomUUID()).onset("k").level((short) 2).phraseText("L2 Phrase 2").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.randomUUID()).onset("k").level((short) 2).phraseText("L2 Phrase 3").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.randomUUID()).onset("k").level((short) 2).phraseText("L2 Phrase 4").source("curated").active(true).build()
        );
        List<DrillPhrase> l3Pool = List.of(
                DrillPhrase.builder().id(UUID.randomUUID()).onset("k").level((short) 3).phraseText("L3 Phrase 1").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.randomUUID()).onset("k").level((short) 3).phraseText("L3 Phrase 2").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.randomUUID()).onset("k").level((short) 3).phraseText("L3 Phrase 3").source("curated").active(true).build()
        );

        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 2)).thenReturn(l2Pool);
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 3)).thenReturn(l3Pool);

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(invocation -> {
            UserDrillPlan plan = invocation.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getStatus()).isEqualTo("active");
        List<DrillPlanItemDto> items = planDto.getItems();

        // L1: max 2 error words (comb, kashmir; 'comb' ties with 'kashmir' on count=2, alphabetical order puts 'comb' before 'kashmir'; 'kitchen' excluded as 3rd)
        List<DrillPlanItemDto> l1Items = items.stream().filter(i -> i.getLevel() == 1).toList();
        assertThat(l1Items).hasSize(2);
        assertThat(l1Items.get(0).getPhraseText()).isEqualTo("comb");
        assertThat(l1Items.get(0).getPhraseSource()).isEqualTo("word");
        assertThat(l1Items.get(0).getFromReport()).isTrue();
        assertThat(l1Items.get(1).getPhraseText()).isEqualTo("kashmir");
        assertThat(l1Items.get(1).getPhraseSource()).isEqualTo("word");
        assertThat(l1Items.get(1).getFromReport()).isTrue();

        // No carrier sentences and no supplementary words
        assertThat(items.stream().anyMatch(i -> "carrier".equals(i.getPhraseSource()))).isFalse();
        assertThat(items.stream().anyMatch(i -> "word_bank".equals(i.getPhraseSource()))).isFalse();

        // L2: up to 3 pool phrases (from 4 available)
        List<DrillPlanItemDto> l2Items = items.stream().filter(i -> i.getLevel() == 2).toList();
        assertThat(l2Items).hasSize(3);

        // L3: up to 2 pool phrases (from 3 available)
        List<DrillPlanItemDto> l3Items = items.stream().filter(i -> i.getLevel() == 3).toList();
        assertThat(l3Items).hasSize(2);

        // Total items: 2 + 3 + 2 = 7
        assertThat(items).hasSize(7);
    }

    @Test
    @DisplayName("Attempt counters increment on pass and record last_attempt_at")
    void testRecordAttemptIncrementsAttemptsAndPassed() {
        UUID ownerId = UUID.randomUUID();
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
                .phraseText("kashmir")
                .phraseSource("word")
                .fromReport(true)
                .attempts(0)
                .passedAttempts(0)
                .build();

        when(userDrillPlanItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(userDrillPlanItemRepository.save(any(UserDrillPlanItem.class))).thenAnswer(i -> i.getArgument(0));

        // 1. First attempt passed -> attempts=1, passed_attempts=1
        DrillPlanItemDto dto1 = drillPlanService.recordAttempt(itemId, ownerId, true);
        assertThat(dto1.getAttempts()).isEqualTo(1);
        assertThat(dto1.getPassedAttempts()).isEqualTo(1);
        assertThat(dto1.getLastAttemptAt()).isNotNull();

        // 2. Second attempt failed -> attempts=2, passed_attempts remains 1
        DrillPlanItemDto dto2 = drillPlanService.recordAttempt(itemId, ownerId, false);
        assertThat(dto2.getAttempts()).isEqualTo(2);
        assertThat(dto2.getPassedAttempts()).isEqualTo(1);
    }

    @Test
    @DisplayName("Learners cannot record attempts or complete another learner's plan items")
    void testNonOwnerCannotUpdatePlanItem() {
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();
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
                .phraseText("kashmir")
                .phraseSource("word")
                .fromReport(true)
                .attempts(0)
                .passedAttempts(0)
                .build();

        when(userDrillPlanItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // Attacker attempt to record attempt -> 403 Forbidden
        assertThatThrownBy(() -> drillPlanService.recordAttempt(itemId, attackerId, true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Forbidden");

        // Attacker attempt to complete item -> 403 Forbidden
        assertThatThrownBy(() -> drillPlanService.completeItem(itemId, attackerId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Forbidden");
    }

    @Test
    @DisplayName("Trigger word tie-break: equal frequencies broken alphabetically ascending ('apple' before 'zebra')")
    void testTriggerWordTieBreakAlphabetical() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Vocabulary", "substitution", "zebra", false));
        errorLog.add(createError("Vocabulary", "substitution", "zebra", false));
        errorLog.add(createError("Vocabulary", "substitution", "apple", false));
        errorLog.add(createError("Vocabulary", "substitution", "apple", false));

        WordBank wbZebra = WordBank.builder().word("zebra").bucket("test_bucket").issueType("mti").active(true).build();
        WordBank wbApple = WordBank.builder().word("apple").bucket("test_bucket").issueType("mti").active(true).build();
        when(wordBankRepository.findFirstByWordIgnoreCaseAndActiveTrueAndIssueType("zebra", "mti")).thenReturn(Optional.of(wbZebra));
        when(wordBankRepository.findFirstByWordIgnoreCaseAndActiveTrueAndIssueType("apple", "mti")).thenReturn(Optional.of(wbApple));

        when(drillPhraseRepository.findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc("test_bucket", (short) 2))
                .thenReturn(Collections.emptyList());
        when(drillPhraseRepository.findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc("test_bucket", (short) 3))
                .thenReturn(Collections.emptyList());

        AssessmentReport report = AssessmentReport.builder().id(UUID.randomUUID()).amcatErrorLog(errorLog).build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(inv -> {
            UserDrillPlan plan = inv.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        assertThat(planDto.getStatus()).isEqualTo("active");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> targets = (List<Map<String, Object>>) planDto.getGenerationSummary().get("targets");
        assertThat(targets).hasSize(1);
        assertThat(targets.get(0).get("trigger_word")).isEqualTo("apple");
    }

    @Test
    @DisplayName("Trigger word selection is stable regardless of error log insertion order")
    void testTriggerWordStableAcrossMapIterations() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Vocabulary", "substitution", "zebra", false));
        errorLog.add(createError("Vocabulary", "substitution", "apple", false));
        errorLog.add(createError("Vocabulary", "substitution", "zebra", false));
        errorLog.add(createError("Vocabulary", "substitution", "apple", false));

        WordBank wbZebra = WordBank.builder().word("zebra").bucket("test_bucket").issueType("mti").active(true).build();
        WordBank wbApple = WordBank.builder().word("apple").bucket("test_bucket").issueType("mti").active(true).build();
        when(wordBankRepository.findFirstByWordIgnoreCaseAndActiveTrueAndIssueType("zebra", "mti")).thenReturn(Optional.of(wbZebra));
        when(wordBankRepository.findFirstByWordIgnoreCaseAndActiveTrueAndIssueType("apple", "mti")).thenReturn(Optional.of(wbApple));

        when(drillPhraseRepository.findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc("test_bucket", (short) 2))
                .thenReturn(Collections.emptyList());
        when(drillPhraseRepository.findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc("test_bucket", (short) 3))
                .thenReturn(Collections.emptyList());

        AssessmentReport report = AssessmentReport.builder().id(UUID.randomUUID()).amcatErrorLog(errorLog).build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(inv -> {
            UserDrillPlan plan = inv.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> targets = (List<Map<String, Object>>) planDto.getGenerationSummary().get("targets");
        assertThat(targets.get(0).get("trigger_word")).isEqualTo("apple");
    }

    @Test
    @DisplayName("Deterministic pool selection: same user + same pool yields identical phrases across plan generations")
    void testDeterministicPoolSelectionPerUser() {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Fluency", "repetition", "kashmir", false));

        AssessmentReport report = AssessmentReport.builder().id(UUID.randomUUID()).amcatErrorLog(errorLog).build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        List<DrillPhrase> pool = List.of(
                DrillPhrase.builder().id(UUID.fromString("11111111-1111-1111-1111-111111111111")).onset("k").level((short) 2).phraseText("Phrase 1").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.fromString("22222222-2222-2222-2222-222222222222")).onset("k").level((short) 2).phraseText("Phrase 2").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.fromString("33333333-3333-3333-3333-333333333333")).onset("k").level((short) 2).phraseText("Phrase 3").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.fromString("44444444-4444-4444-4444-444444444444")).onset("k").level((short) 2).phraseText("Phrase 4").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.fromString("55555555-5555-5555-5555-555555555555")).onset("k").level((short) 2).phraseText("Phrase 5").source("curated").active(true).build()
        );
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 2)).thenReturn(pool);
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 3)).thenReturn(Collections.emptyList());

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(inv -> {
            UserDrillPlan plan = inv.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        DrillPlanDto plan1 = drillPlanService.getOrCreatePlan(userId);
        List<String> phrasesRun1 = plan1.getItems().stream()
                .filter(i -> i.getLevel() == 2)
                .map(DrillPlanItemDto::getPhraseText)
                .toList();

        DrillPlanDto plan2 = drillPlanService.getOrCreatePlan(userId);
        List<String> phrasesRun2 = plan2.getItems().stream()
                .filter(i -> i.getLevel() == 2)
                .map(DrillPlanItemDto::getPhraseText)
                .toList();

        assertThat(phrasesRun1).isNotEmpty();
        assertThat(phrasesRun1).isEqualTo(phrasesRun2);
    }

    @Test
    @DisplayName("Different users get different pool phrase selection order for the same candidate pool")
    void testDifferentUsersGetDifferentPoolOrder() {
        List<DrillPhrase> pool = List.of(
                DrillPhrase.builder().id(UUID.fromString("11111111-1111-1111-1111-111111111111")).onset("k").level((short) 2).phraseText("Phrase 1").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.fromString("22222222-2222-2222-2222-222222222222")).onset("k").level((short) 2).phraseText("Phrase 2").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.fromString("33333333-3333-3333-3333-333333333333")).onset("k").level((short) 2).phraseText("Phrase 3").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.fromString("44444444-4444-4444-4444-444444444444")).onset("k").level((short) 2).phraseText("Phrase 4").source("curated").active(true).build(),
                DrillPhrase.builder().id(UUID.fromString("55555555-5555-5555-5555-555555555555")).onset("k").level((short) 2).phraseText("Phrase 5").source("curated").active(true).build()
        );
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 2)).thenReturn(pool);
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 3)).thenReturn(Collections.emptyList());

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(inv -> {
            UserDrillPlan plan = inv.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        // userA -> hashes first to Phrase 3; userB -> hashes first to Phrase 1 (verified via Python MD5 MSB)
        UUID userA = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID userB = UUID.fromString("00000000-0000-0000-0000-000000000003");

        when(userDrillPlanRepository.findByUserId(any(UUID.class))).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Fluency", "repetition", "kashmir", false));
        AssessmentReport report = AssessmentReport.builder().id(UUID.randomUUID()).amcatErrorLog(errorLog).build();
        when(assessmentReportRepository.findLatestByUserId(any(UUID.class))).thenReturn(Optional.of(report));

        DrillPlanDto planA = drillPlanService.getOrCreatePlan(userA);
        DrillPlanDto planB = drillPlanService.getOrCreatePlan(userB);

        String firstPhraseA = planA.getItems().stream()
                .filter(i -> i.getLevel() == 2)
                .map(DrillPlanItemDto::getPhraseText)
                .findFirst().orElseThrow();
        String firstPhraseB = planB.getItems().stream()
                .filter(i -> i.getLevel() == 2)
                .map(DrillPlanItemDto::getPhraseText)
                .findFirst().orElseThrow();

        assertThat(firstPhraseA).isNotEqualTo(firstPhraseB);
    }

    @Test
    @DisplayName("Selection is independent of repository query return order for a given user")
    void testSelectionIndependentOfRepoOrder() {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Fluency", "repetition", "kashmir", false));
        AssessmentReport report = AssessmentReport.builder().id(UUID.randomUUID()).amcatErrorLog(errorLog).build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        DrillPhrase dp1 = DrillPhrase.builder().id(UUID.fromString("11111111-1111-1111-1111-111111111111")).onset("k").level((short) 2).phraseText("Phrase 1").source("curated").active(true).build();
        DrillPhrase dp2 = DrillPhrase.builder().id(UUID.fromString("22222222-2222-2222-2222-222222222222")).onset("k").level((short) 2).phraseText("Phrase 2").source("curated").active(true).build();
        DrillPhrase dp3 = DrillPhrase.builder().id(UUID.fromString("33333333-3333-3333-3333-333333333333")).onset("k").level((short) 2).phraseText("Phrase 3").source("curated").active(true).build();
        DrillPhrase dp4 = DrillPhrase.builder().id(UUID.fromString("44444444-4444-4444-4444-444444444444")).onset("k").level((short) 2).phraseText("Phrase 4").source("curated").active(true).build();
        DrillPhrase dp5 = DrillPhrase.builder().id(UUID.fromString("55555555-5555-5555-5555-555555555555")).onset("k").level((short) 2).phraseText("Phrase 5").source("curated").active(true).build();

        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 3)).thenReturn(Collections.emptyList());
        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(inv -> {
            UserDrillPlan plan = inv.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        // Repo order: 1, 2, 3, 4, 5
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 2))
                .thenReturn(List.of(dp1, dp2, dp3, dp4, dp5));
        DrillPlanDto plan1 = drillPlanService.getOrCreatePlan(userId);
        List<String> phrasesRun1 = plan1.getItems().stream()
                .filter(i -> i.getLevel() == 2)
                .map(DrillPlanItemDto::getPhraseText)
                .toList();

        // Repo order: 5, 3, 1, 4, 2 (shuffled)
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 2))
                .thenReturn(List.of(dp5, dp3, dp1, dp4, dp2));
        DrillPlanDto plan2 = drillPlanService.getOrCreatePlan(userId);
        List<String> phrasesRun2 = plan2.getItems().stream()
                .filter(i -> i.getLevel() == 2)
                .map(DrillPlanItemDto::getPhraseText)
                .toList();

        assertThat(phrasesRun1).isEqualTo(phrasesRun2);
    }

    @Test
    @DisplayName("Pool phrase with source 'llm_pool' is mapped to UserDrillPlanItem phraseSource 'llm_pool'")
    void testPhraseSourceLlmPoolAccepted() {
        UUID userId = UUID.randomUUID();
        when(userDrillPlanRepository.findByUserId(userId)).thenReturn(Optional.empty());

        ArrayNode errorLog = objectMapper.createArrayNode();
        errorLog.add(createError("Fluency", "repetition", "kashmir", false));
        AssessmentReport report = AssessmentReport.builder().id(UUID.randomUUID()).amcatErrorLog(errorLog).build();
        when(assessmentReportRepository.findLatestByUserId(userId)).thenReturn(Optional.of(report));

        DrillPhrase llmPhrase = DrillPhrase.builder()
                .id(UUID.randomUUID())
                .onset("k")
                .level((short) 2)
                .phraseText("The keen king kept kindly keys")
                .source("llm_pool")
                .active(true)
                .build();

        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 2))
                .thenReturn(List.of(llmPhrase));
        when(drillPhraseRepository.findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc("k", (short) 3))
                .thenReturn(Collections.emptyList());

        when(userDrillPlanRepository.save(any(UserDrillPlan.class))).thenAnswer(inv -> {
            UserDrillPlan plan = inv.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        DrillPlanDto planDto = drillPlanService.getOrCreatePlan(userId);

        DrillPlanItemDto poolItem = planDto.getItems().stream()
                .filter(i -> i.getLevel() == 2)
                .findFirst()
                .orElseThrow();

        assertThat(poolItem.getPhraseSource()).isEqualTo("llm_pool");
        assertThat(poolItem.getPhraseText()).isEqualTo("The keen king kept kindly keys");
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

