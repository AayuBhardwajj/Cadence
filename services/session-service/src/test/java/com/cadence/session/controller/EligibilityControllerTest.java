package com.cadence.session.controller;

import com.cadence.session.config.SecurityConfig;
import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.service.EligibilityService;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EligibilityController.class)
@Import(SecurityConfig.class)
class EligibilityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EligibilityService eligibilityService;

    // ── Auth-validation tests (unchanged) ────────────────────────────────────

    @Test
    void whenUserIdMissing_returns401() throws Exception {
        mockMvc.perform(get("/eligibility"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid or missing user identity."));
    }

    @Test
    void whenUserIdInvalidShort_returns401() throws Exception {
        mockMvc.perform(get("/eligibility").param("user_id", "short"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid or missing user identity."));
    }

    // ── D7 stub test ─────────────────────────────────────────────────────────

    /**
     * DECISIONS.md D7 (2026-08-09): service always returns the stub.
     * Asserts the controller passes it through with the correct sentinel values.
     */
    @Test
    void whenValidUserId_returnsD7StubResponse() throws Exception {
        UUID validUuid = UUID.randomUUID();
        when(eligibilityService.getEligibility(any(UUID.class)))
                .thenReturn(new EligibilityResponse(true, null, 999));

        mockMvc.perform(get("/eligibility").param("user_id", validUuid.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.can_assess").value(true))
                .andExpect(jsonPath("$.next_available_at").isEmpty())
                .andExpect(jsonPath("$.assessments_remaining").value(999));
    }

    @Test
    void whenEligible_returnsCanAssessTrue() throws Exception {
        UUID validUuid = UUID.randomUUID();
        when(eligibilityService.getEligibility(any(UUID.class)))
                .thenReturn(new EligibilityResponse(true, null, 999));

        mockMvc.perform(get("/eligibility").param("user_id", validUuid.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.can_assess").value(true))
                .andExpect(jsonPath("$.next_available_at").isEmpty())
                .andExpect(jsonPath("$.assessments_remaining").value(999));
    }

    // ── Cooldown controller test — DISABLED per DECISIONS.md D7 (2026-08-09) ─
    // Preserved intact so it can be re-enabled if D7 is reopened.

    @Test
    @Disabled("DECISIONS.md D7 (2026-08-09): cooldown disabled — re-enable if D7 is reopened")
    void whenOnCooldown_returnsCanAssessFalseAndNextAvailableAt() throws Exception {
        // Original test body preserved for future re-enable:
        // UUID validUuid = UUID.randomUUID();
        // OffsetDateTime nextAvailable = OffsetDateTime.now().plusHours(12);
        // when(eligibilityService.getEligibility(any(UUID.class)))
        //         .thenReturn(new EligibilityResponse(false, nextAvailable, 0));
        //
        // mockMvc.perform(get("/eligibility").param("user_id", validUuid.toString()))
        //         .andExpect(status().isOk())
        //         .andExpect(jsonPath("$.can_assess").value(false))
        //         .andExpect(jsonPath("$.next_available_at").exists())
        //         .andExpect(jsonPath("$.assessments_remaining").value(0));
    }
}
