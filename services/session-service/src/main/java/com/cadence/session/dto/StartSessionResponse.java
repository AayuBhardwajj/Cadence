package com.cadence.session.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StartSessionResponse {

    private String status;

    @JsonProperty("sessionId")
    private UUID sessionId;

    @JsonProperty("persistence_warnings")
    private List<String> persistenceWarnings;
}
