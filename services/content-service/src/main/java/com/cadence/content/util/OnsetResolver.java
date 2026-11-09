package com.cadence.content.util;

import lombok.extern.slf4j.Slf4j;

import java.util.Optional;
import java.util.Set;

/**
 * Pure function deterministic grapheme-to-onset resolver.
 * Maps words/graphemes to phonological onset keys for personalized drills.
 * Governed by DECISIONS.md D28 (no LLM, deterministic, observable-behavior).
 */
@Slf4j
public final class OnsetResolver {

    private static final Set<String> TH_VOICED_WORDS = Set.of(
            "the", "this", "that", "these", "those",
            "them", "then", "there", "therefore", "though", "they", "than"
    );

    private static final Set<String> SILENT_H_PREFIXES = Set.of(
            "honest", "hour", "honor", "heir"
    );

    private static final Set<String> HARD_G_EXCEPTIONS = Set.of(
            "get", "give", "girl", "gift"
    );

    private OnsetResolver() {
        // Utility class
    }

    /**
     * Resolves a word's grapheme onset to a standardized onset key.
     *
     * @param word Raw word from error log or vocabulary bank
     * @return Optional containing the onset key, or Optional.empty() if unresolvable
     */
    public static Optional<String> resolve(String word) {
        if (word == null) {
            log.debug("Skipping null word in OnsetResolver");
            return Optional.empty();
        }

        // Clean punctuation and normalize
        String cleaned = word.trim().toLowerCase().replaceAll("^[^a-z]+|[^a-z]+$", "");
        if (cleaned.isEmpty()) {
            log.debug("Skipping unresolvable empty or non-alphabetic word: '{}'", word);
            return Optional.empty();
        }

        char firstChar = cleaned.charAt(0);
        if (firstChar < 'a' || firstChar > 'z') {
            log.debug("Skipping unresolvable non-letter word: '{}'", word);
            return Optional.empty();
        }

        // 1. Silent initial consonant clusters: kn-, gn-, pn- -> n
        if (cleaned.startsWith("kn") || cleaned.startsWith("gn") || cleaned.startsWith("pn")) {
            return Optional.of("n");
        }

        // 2. ps- -> s
        if (cleaned.startsWith("ps")) {
            return Optional.of("s");
        }

        // 3. ph- -> f
        if (cleaned.startsWith("ph")) {
            return Optional.of("f");
        }

        // 4. wr- -> r
        if (cleaned.startsWith("wr")) {
            return Optional.of("r");
        }

        // 5. wh- -> w
        if (cleaned.startsWith("wh")) {
            return Optional.of("w");
        }

        // 6. qu- -> k
        if (cleaned.startsWith("qu")) {
            return Optional.of("k");
        }

        // 7. ch- -> ch (tʃ)
        if (cleaned.startsWith("ch")) {
            return Optional.of("ch");
        }

        // 8. th- -> 'th_voiced' for function words, else 'th_voiceless'
        if (cleaned.startsWith("th")) {
            if (isThVoiced(cleaned)) {
                return Optional.of("th_voiced");
            }
            return Optional.of("th_voiceless");
        }

        // 9. c + [e, i, y] -> s; c elsewhere -> k
        if (cleaned.startsWith("c")) {
            if (cleaned.length() > 1) {
                char second = cleaned.charAt(1);
                if (second == 'e' || second == 'i' || second == 'y') {
                    return Optional.of("s");
                }
            }
            return Optional.of("k");
        }

        // 10. k -> k
        if (cleaned.startsWith("k")) {
            return Optional.of("k");
        }

        // 11. g + [e, i, y] -> 'j' except "get", "give", "girl", "gift" -> g; g elsewhere -> g
        if (cleaned.startsWith("g")) {
            if (isHardGException(cleaned)) {
                return Optional.of("g");
            }
            if (cleaned.length() > 1) {
                char second = cleaned.charAt(1);
                if (second == 'e' || second == 'i' || second == 'y') {
                    return Optional.of("j");
                }
            }
            return Optional.of("g");
        }

        // 12. silent-h list {honest, hour, honor, heir} -> 'vowel'
        if (isSilentH(cleaned)) {
            return Optional.of("vowel");
        }

        // 13. Otherwise first letter
        return Optional.of(String.valueOf(firstChar));
    }

    private static boolean isThVoiced(String word) {
        if (TH_VOICED_WORDS.contains(word)) {
            return true;
        }
        for (String func : TH_VOICED_WORDS) {
            if (word.startsWith(func)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isHardGException(String word) {
        for (String exc : HARD_G_EXCEPTIONS) {
            if (word.startsWith(exc)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isSilentH(String word) {
        for (String hPrefix : SILENT_H_PREFIXES) {
            if (word.startsWith(hPrefix)) {
                return true;
            }
        }
        return false;
    }
}

