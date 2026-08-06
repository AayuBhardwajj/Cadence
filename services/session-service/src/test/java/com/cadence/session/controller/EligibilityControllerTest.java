package com.cadence.session.controller;

import com.cadence.session.config.SecurityConfig;
import com.cadence.session.dto.EligibilityResponse;
import com.cadence.session.service.EligibilityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
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

    @Test
    void whenEligible_returnsCanAssessTrue() throws Exception {
        UUID validUuid = UUID.randomUUID();
        when(eligibilityService.getEligibility(any(UUID.class)))
                .thenReturn(new EligibilityResponse(true, null, 1));

        mockMvc.perform(get("/eligibility").param("user_id", validUuid.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.can_assess").value(true))
                .andExpect(jsonPath("$.next_available_at").isEmpty())
                .andExpect(jsonPath("$.assessments_remaining").value(1));
    }

    @Test
    void whenOnCooldown_returnsCanAssessFalseAndNextAvailableAt() throws Exception {
        UUID validUuid = UUID.randomUUID();
        OffsetDateTime nextAvailable = OffsetDateTime.now().plusHours(12);
        when(eligibilityService.getEligibility(any(UUID.class)))
                .thenReturn(new EligibilityResponse(false, nextAvailable, 0));

        mockMvc.perform(get("/eligibility").param("user_id", validUuid.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.can_assess").value(false))
                .andExpect(jsonPath("$.next_available_at").exists())
                .andExpect(jsonPath("$.assessments_remaining").value(0));
    }
}
