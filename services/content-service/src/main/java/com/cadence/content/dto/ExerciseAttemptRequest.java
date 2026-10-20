package com.cadence.content.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseAttemptRequest {

    @NotBlank(message = "Response text cannot be empty")
    private String responseText;
}
