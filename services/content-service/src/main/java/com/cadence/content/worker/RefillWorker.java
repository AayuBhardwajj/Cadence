package com.cadence.content.worker;

import com.cadence.content.entity.GeneratedPassage;
import com.cadence.content.entity.PassagePool;
import com.cadence.content.repository.PassagePoolRepository;
import com.cadence.content.repository.RefillLockRepository;
import com.cadence.content.service.PassageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Component
@Slf4j
public class RefillWorker {

    public static final int TARGET_POOL_SIZE = 5;

    private final RefillLockRepository refillLockRepository;
    private final PassagePoolRepository passagePoolRepository;
    private final PassageService passageService;
    private final long refillIntervalSeconds;

    public RefillWorker(
            RefillLockRepository refillLockRepository,
            PassagePoolRepository passagePoolRepository,
            PassageService passageService,
            @Value("${cadence.refill.interval-seconds:600}") long refillIntervalSeconds
    ) {
        this.refillLockRepository = refillLockRepository;
        this.passagePoolRepository = passagePoolRepository;
        this.passageService = passageService;
        this.refillIntervalSeconds = refillIntervalSeconds;
    }

    @Scheduled(fixedDelayString = "${cadence.refill.interval-seconds:600}000", initialDelay = 5000)
    public void refillCycle() {
        log.info("Refill worker cycle starting: attempting to acquire lock...");
        Boolean acquired = false;
        try {
            acquired = refillLockRepository.tryRefillLock();
            if (acquired == null || !acquired) {
                log.info("refill cycle skipped, lock held elsewhere");
                return;
            }
        } catch (Exception lockErr) {
            log.error("Failed to check/acquire refill lock: {}", lockErr.getMessage(), lockErr);
            return;
        }

        log.info("Refill lock acquired. Counting pool demand (single pass)...");

        try {
            // ── Single-pass combo count query optimization ─────────────────────
            Map<String, Long> comboCounts = new HashMap<>();
            try {
                List<PassagePoolRepository.ComboCountProjection> projections = passagePoolRepository.getAvailableComboCounts();
                for (PassagePoolRepository.ComboCountProjection p : projections) {
                    if (p.getTopic() != null && p.getDifficulty() != null) {
                        comboCounts.put(p.getTopic().toLowerCase() + "/" + p.getDifficulty().toLowerCase(), p.getCnt());
                    }
                }
            } catch (Exception countErr) {
                log.warn("Pre-cycle count query failed (will attempt top-up conservatively): {}", countErr.getMessage(), countErr);
            }

            int totalCombos = PassageService.FIXED_TOPICS.size() * PassageService.DIFFICULTIES.size();
            int combosNeedingRefill = 0;

            for (String topic : PassageService.FIXED_TOPICS) {
                for (String diff : PassageService.DIFFICULTIES) {
                    long currentCount = comboCounts.getOrDefault(topic.toLowerCase() + "/" + diff.toLowerCase(), 0L);
                    if (currentCount < TARGET_POOL_SIZE) {
                        combosNeedingRefill++;
                    }
                }
            }

            log.info("Pool demand: {}/{} combos need refilling (below TARGET_POOL_SIZE={}), {}/{} already full.",
                    combosNeedingRefill, totalCombos, TARGET_POOL_SIZE, (totalCombos - combosNeedingRefill), totalCombos);

            int totalGenerated = 0;
            List<String> toppedUpCombos = new ArrayList<>();

            for (String topic : PassageService.FIXED_TOPICS) {
                for (String difficulty : PassageService.DIFFICULTIES) {
                    long currentCount = comboCounts.getOrDefault(topic.toLowerCase() + "/" + difficulty.toLowerCase(), 0L);

                    if (currentCount < TARGET_POOL_SIZE) {
                        long needed = TARGET_POOL_SIZE - currentCount;
                        log.info("Combo {}/{}: {} available, generating {} more.", topic, difficulty, currentCount, needed);

                        int generatedForCombo = 0;
                        for (int i = 0; i < needed; i++) {
                            try {
                                GeneratedPassage gp = passageService.generatePassage(difficulty, topic, null, 8);
                                PassagePool poolRow = PassagePool.builder()
                                        .passageId(gp.getId())
                                        .topic(topic)
                                        .difficulty(difficulty)
                                        .status("available")
                                        .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                                        .build();

                                passagePoolRepository.save(poolRow);
                                generatedForCombo++;
                                totalGenerated++;

                                Thread.sleep(1500); // 1.5s delay to respect Groq TPM
                            } catch (Exception genErr) {
                                log.error("Failed to generate for pool top-up ({}/{}): {}", topic, difficulty, genErr.getMessage(), genErr);
                            }
                        }

                        if (generatedForCombo > 0) {
                            toppedUpCombos.add(topic + "/" + difficulty + " (+" + generatedForCombo + ")");
                        }
                    }
                }
            }

            log.info("Refill cycle done. Combos topped up: {}. Total generated: {}.",
                    toppedUpCombos.isEmpty() ? "none" : String.join(", ", toppedUpCombos), totalGenerated);

        } finally {
            try {
                refillLockRepository.unlockRefill();
                log.info("Refill lock released.");
            } catch (Exception unlockErr) {
                log.error("Failed to release refill lock: {}", unlockErr.getMessage(), unlockErr);
            }
        }
    }
}
