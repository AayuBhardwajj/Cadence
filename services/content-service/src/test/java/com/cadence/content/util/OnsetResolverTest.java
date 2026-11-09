package com.cadence.content.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OnsetResolverTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("Verify OnsetResolver against shared golden vector file (infrastructure/shared/onset_golden.json)")
    void testGoldenVectorFile() throws Exception {
        // Find golden vector file by checking working directory / repo root paths
        Path goldenPath = Path.of("../../infrastructure/shared/onset_golden.json");
        if (!Files.exists(goldenPath)) {
            goldenPath = Path.of("infrastructure/shared/onset_golden.json");
        }
        if (!Files.exists(goldenPath)) {
            goldenPath = Path.of("../../../infrastructure/shared/onset_golden.json");
        }

        assertThat(Files.exists(goldenPath))
                .withFailMessage("Golden vector file must exist at " + goldenPath.toAbsolutePath())
                .isTrue();

        Map<String, String> golden = objectMapper.readValue(
                Files.readAllBytes(goldenPath),
                new TypeReference<>() {}
        );

        assertThat(golden).isNotEmpty();

        for (Map.Entry<String, String> entry : golden.entrySet()) {
            String word = entry.getKey();
            String expected = entry.getValue();

            Optional<String> actual = OnsetResolver.resolve(word);
            assertThat(actual)
                    .withFailMessage("Word '%s' expected onset '%s' but got '%s'", word, expected, actual.orElse("empty"))
                    .isPresent()
                    .contains(expected);
        }
    }

    @Test
    @DisplayName("Unresolvable words (empty, numeric, symbols) return Optional.empty()")
    void testUnresolvableWords() {
        assertThat(OnsetResolver.resolve(null)).isEmpty();
        assertThat(OnsetResolver.resolve("")).isEmpty();
        assertThat(OnsetResolver.resolve("   ")).isEmpty();
        assertThat(OnsetResolver.resolve("123")).isEmpty();
        assertThat(OnsetResolver.resolve("---")).isEmpty();
        assertThat(OnsetResolver.resolve("@#$")).isEmpty();
    }
}

