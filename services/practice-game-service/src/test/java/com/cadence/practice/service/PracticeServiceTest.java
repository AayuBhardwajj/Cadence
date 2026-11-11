package com.cadence.practice.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PracticeServiceTest {

    @Test
    @DisplayName("Boundary 4 words (threshold 0.15): one word wrong yields WER 0.25 > 0.15 -> match rejected")
    void testBoundary4WordsOneWrong() {
        String target = "one two three four";
        String transcribed = "one two three wrong";

        double threshold = PracticeService.thresholdFor(4);
        assertThat(threshold).isEqualTo(0.15);

        double wer = PracticeService.computeWer(target, transcribed);
        assertThat(wer).isEqualTo(0.25);

        boolean isMatch = wer <= threshold;
        assertThat(isMatch).isFalse();
    }

    @Test
    @DisplayName("Boundary 5 words (threshold 0.25): one word wrong yields WER 0.20 <= 0.25 -> match accepted")
    void testBoundary5WordsOneWrong() {
        String target = "one two three four five";
        String transcribed = "one two three four wrong";

        double threshold = PracticeService.thresholdFor(5);
        assertThat(threshold).isEqualTo(0.25);

        double wer = PracticeService.computeWer(target, transcribed);
        assertThat(wer).isEqualTo(0.20);

        boolean isMatch = wer <= threshold;
        assertThat(isMatch).isTrue();
    }

    @Test
    @DisplayName("Boundary 7 words (threshold 0.25): one word wrong yields WER 0.1429 <= 0.25 -> match accepted")
    void testBoundary7WordsOneWrong() {
        String target = "one two three four five six seven";
        String transcribed = "one two three four five six wrong";

        double threshold = PracticeService.thresholdFor(7);
        assertThat(threshold).isEqualTo(0.25);

        double wer = PracticeService.computeWer(target, transcribed);
        assertThat(wer).isLessThan(0.25);

        boolean isMatch = wer <= threshold;
        assertThat(isMatch).isTrue();
    }

    @Test
    @DisplayName("Boundary 8 words (threshold 0.35): one word wrong yields WER 0.125 <= 0.35 -> match accepted")
    void testBoundary8WordsOneWrong() {
        String target = "one two three four five six seven eight";
        String transcribed = "one two three four five six seven wrong";

        double threshold = PracticeService.thresholdFor(8);
        assertThat(threshold).isEqualTo(0.35);

        double wer = PracticeService.computeWer(target, transcribed);
        assertThat(wer).isEqualTo(0.125);

        boolean isMatch = wer <= threshold;
        assertThat(isMatch).isTrue();
    }
}

