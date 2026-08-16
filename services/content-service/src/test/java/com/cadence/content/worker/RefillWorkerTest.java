package com.cadence.content.worker;

import com.cadence.content.entity.GeneratedPassage;
import com.cadence.content.entity.PassagePool;
import com.cadence.content.repository.PassagePoolRepository;
import com.cadence.content.repository.RefillLockRepository;
import com.cadence.content.service.PassageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RefillWorkerTest {

    private RefillLockRepository refillLockRepository;
    private PassagePoolRepository passagePoolRepository;
    private PassageService passageService;
    private RefillWorker refillWorker;

    @BeforeEach
    void setUp() {
        refillLockRepository = mock(RefillLockRepository.class);
        passagePoolRepository = mock(PassagePoolRepository.class);
        passageService = mock(PassageService.class);
        refillWorker = new RefillWorker(refillLockRepository, passagePoolRepository, passageService, 600);
    }

    @Test
    void testRefillCycleSkipsWhenLockNotAcquired() {
        when(refillLockRepository.tryRefillLock()).thenReturn(false);

        refillWorker.refillCycle();

        verify(passagePoolRepository, never()).getAvailableComboCounts();
        verify(refillLockRepository, never()).unlockRefill();
    }

    @Test
    void testRefillCycleTopUpAndReleasesLockInFinally() {
        when(refillLockRepository.tryRefillLock()).thenReturn(true);

        List<PassagePoolRepository.ComboCountProjection> projections = new ArrayList<>();
        // Mark all 15 combos as having 5 items (full) except workplace_communication/easy having 4 items (needs 1)
        for (String topic : PassageService.FIXED_TOPICS) {
            for (String diff : PassageService.DIFFICULTIES) {
                long cnt = ("workplace_communication".equals(topic) && "easy".equals(diff)) ? 4L : 5L;
                projections.add(new PassagePoolRepository.ComboCountProjection() {
                    @Override
                    public String getTopic() { return topic; }
                    @Override
                    public String getDifficulty() { return diff; }
                    @Override
                    public Long getCnt() { return cnt; }
                });
            }
        }

        when(passagePoolRepository.getAvailableComboCounts()).thenReturn(projections);

        GeneratedPassage mockGp = GeneratedPassage.builder()
                .id(UUID.randomUUID())
                .passageText("Mock text")
                .difficulty("easy")
                .topic("workplace_communication")
                .build();

        when(passageService.generatePassage(anyString(), anyString(), any(), anyInt()))
                .thenReturn(mockGp);

        refillWorker.refillCycle();

        verify(passagePoolRepository, times(1)).save(any(PassagePool.class));
        verify(refillLockRepository, times(1)).unlockRefill();
    }
}
