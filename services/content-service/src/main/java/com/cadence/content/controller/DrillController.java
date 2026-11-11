package com.cadence.content.controller;

import com.cadence.content.dto.DrillPlanDto;
import com.cadence.content.dto.DrillPlanItemDto;
import com.cadence.content.dto.RecordAttemptRequest;
import com.cadence.content.security.CurrentLearnerId;
import com.cadence.content.service.DrillPlanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/drills")
@RequiredArgsConstructor
@Slf4j
public class DrillController {

    private final DrillPlanService drillPlanService;

    @PostMapping("/plan")
    public ResponseEntity<DrillPlanDto> getOrCreatePlan(@CurrentLearnerId UUID currentLearnerId) {
        log.info("Request to get-or-create personalized drill plan for learner {}", currentLearnerId);
        DrillPlanDto plan = drillPlanService.getOrCreatePlan(currentLearnerId);
        return ResponseEntity.ok(plan);
    }

    @GetMapping("/plan")
    public ResponseEntity<DrillPlanDto> getPlan(@CurrentLearnerId UUID currentLearnerId) {
        DrillPlanDto plan = drillPlanService.getPlan(currentLearnerId);
        return ResponseEntity.ok(plan);
    }

    @PostMapping("/plan/items/{itemId}/complete")
    public ResponseEntity<DrillPlanItemDto> completeItem(
            @PathVariable("itemId") UUID itemId,
            @CurrentLearnerId UUID currentLearnerId
    ) {
        DrillPlanItemDto item = drillPlanService.completeItem(itemId, currentLearnerId);
        return ResponseEntity.ok(item);
    }

    @PostMapping("/plan/items/{itemId}/attempt")
    public ResponseEntity<DrillPlanItemDto> recordAttempt(
            @PathVariable("itemId") UUID itemId,
            @RequestBody RecordAttemptRequest request,
            @CurrentLearnerId UUID currentLearnerId
    ) {
        boolean passed = request != null && Boolean.TRUE.equals(request.getPassed());
        DrillPlanItemDto item = drillPlanService.recordAttempt(itemId, currentLearnerId, passed);
        return ResponseEntity.ok(item);
    }
}

