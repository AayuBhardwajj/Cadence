package com.cadence.content.controller;

import com.cadence.content.dto.DrillPlanDto;
import com.cadence.content.dto.DrillPlanItemDto;
import com.cadence.content.dto.RecordAttemptRequest;
import com.cadence.content.service.DrillPlanService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DrillControllerTest {

    @Mock
    private DrillPlanService drillPlanService;

    @InjectMocks
    private DrillController drillController;

    @Test
    @DisplayName("POST /api/drills/plan delegates to service and returns 200 with plan")
    void testGetOrCreatePlan() {
        UUID userId = UUID.randomUUID();
        DrillPlanDto expected = DrillPlanDto.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .status("active")
                .items(List.of())
                .build();

        when(drillPlanService.getOrCreatePlan(userId)).thenReturn(expected);

        ResponseEntity<DrillPlanDto> response = drillController.getOrCreatePlan(userId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(expected.getId());
        assertThat(response.getBody().getItems()).isNotNull();
    }

    @Test
    @DisplayName("POST /api/drills/plan returns 200 with status 'no_targets' and items is empty list (never null)")
    void testGetOrCreatePlan_NoTargetsReturnsEmptyItemList() {
        UUID userId = UUID.randomUUID();
        DrillPlanDto noTargetsPlan = DrillPlanDto.builder()
                .status("no_targets")
                .build();

        when(drillPlanService.getOrCreatePlan(userId)).thenReturn(noTargetsPlan);

        ResponseEntity<DrillPlanDto> response = drillController.getOrCreatePlan(userId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("no_targets");
        assertThat(response.getBody().getItems()).isNotNull().isEmpty();
    }

    @Test
    @DisplayName("GET /api/drills/plan returns plan when exists, or propagates 404")
    void testGetPlan() {
        UUID userId = UUID.randomUUID();
        DrillPlanDto expected = DrillPlanDto.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .status("active")
                .build();

        when(drillPlanService.getPlan(userId)).thenReturn(expected);

        ResponseEntity<DrillPlanDto> response = drillController.getPlan(userId);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(expected);

        when(drillPlanService.getPlan(userId))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "No drill plan found for user"));

        assertThatThrownBy(() -> drillController.getPlan(userId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    @DisplayName("POST /api/drills/plan/items/{itemId}/complete delegates to service")
    void testCompleteItem() {
        UUID userId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        DrillPlanItemDto itemDto = DrillPlanItemDto.builder()
                .id(itemId)
                .completedAt(OffsetDateTime.now())
                .build();

        when(drillPlanService.completeItem(itemId, userId)).thenReturn(itemDto);

        ResponseEntity<DrillPlanItemDto> response = drillController.completeItem(itemId, userId);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("POST /api/drills/plan/items/{itemId}/attempt delegates to service with passed boolean")
    void testRecordAttempt() {
        UUID userId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        DrillPlanItemDto itemDto = DrillPlanItemDto.builder()
                .id(itemId)
                .attempts(1)
                .passedAttempts(1)
                .lastAttemptAt(OffsetDateTime.now())
                .build();

        when(drillPlanService.recordAttempt(itemId, userId, true)).thenReturn(itemDto);

        RecordAttemptRequest request = new RecordAttemptRequest(true);
        ResponseEntity<DrillPlanItemDto> response = drillController.recordAttempt(itemId, request, userId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getAttempts()).isEqualTo(1);
        assertThat(response.getBody().getPassedAttempts()).isEqualTo(1);
    }
}

