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
public class UploadAssessmentResponse {

    private String status;

    @JsonProperty("sessionId")
    private UUID sessionId;

    @JsonProperty("storagePath")
    private String storagePath;

    @JsonProperty("signedUrl")
    private String signedUrl;

    private String bucket;

    @JsonProperty("persistence_warnings")
    private List<String> persistenceWarnings;
}
