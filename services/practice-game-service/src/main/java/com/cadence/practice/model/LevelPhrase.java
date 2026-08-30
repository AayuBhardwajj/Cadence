package com.cadence.practice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LevelPhrase {
    private String id;
    private String bucket;
    private String targetText;
    private List<String> focusWords;
    private String difficulty;
}
