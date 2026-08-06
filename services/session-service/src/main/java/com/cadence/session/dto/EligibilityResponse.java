package com.cadence.session.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.OffsetDateTime;

public record EligibilityResponse(
    @JsonProperty("can_assess") boolean canAssess,
    @JsonProperty("next_available_at") OffsetDateTime nextAvailableAt,
    @JsonProperty("assessments_remaining") int assessmentsRemaining
) {}
