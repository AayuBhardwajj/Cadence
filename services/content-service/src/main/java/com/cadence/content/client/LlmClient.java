package com.cadence.content.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

/**
 * Java LLM Client for content-service mirroring llm_client.py's volume_tier chain.
 * Chain: Groq openai/gpt-oss-20b (primary) -> Gemini gemini-3.1-flash-lite (fallback).
 * Includes D9 single-retry mitigation for Groq json_validate_failed error.
 */
@Component
@Slf4j
public class LlmClient {

    private final String groqApiKey;
    private final String geminiApiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired
    public LlmClient(
            @Value("${cadence.llm.groq-api-key:}") String groqApiKey,
            @Value("${cadence.llm.gemini-api-key:}") String geminiApiKey
    ) {
        this(groqApiKey, geminiApiKey, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build(), new ObjectMapper());
    }

    public LlmClient(
            String groqApiKey,
            String geminiApiKey,
            HttpClient httpClient,
            ObjectMapper objectMapper
    ) {
        this.groqApiKey = groqApiKey != null ? groqApiKey.trim() : "";
        this.geminiApiKey = geminiApiKey != null ? geminiApiKey.trim() : "";
        this.httpClient = httpClient != null ? httpClient : HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public String callVolumeTier(String prompt, String systemMessage, boolean responseFormatJson) {
        List<String> errors = new ArrayList<>();

        // 1. Primary: Groq openai/gpt-oss-20b
        if (!groqApiKey.isEmpty()) {
            try {
                return callGroq("openai/gpt-oss-20b", prompt, systemMessage, responseFormatJson);
            } catch (Exception e) {
                log.warn("Groq volume_tier call failed: {}", e.getMessage());
                errors.add("groq/openai/gpt-oss-20b: " + e.getMessage());
            }
        } else {
            errors.add("groq/openai/gpt-oss-20b: GROQ_API_KEY not set");
        }

        // 2. Fallback: Gemini gemini-3.1-flash-lite
        if (!geminiApiKey.isEmpty()) {
            try {
                return callGemini("gemini-3.1-flash-lite", prompt, systemMessage);
            } catch (Exception e) {
                log.warn("Gemini volume_tier fallback failed: {}", e.getMessage());
                errors.add("gemini/gemini-3.1-flash-lite: " + e.getMessage());
            }
        } else {
            errors.add("gemini/gemini-3.1-flash-lite: GEMINI_API_KEY not set");
        }

        throw new RuntimeException("All LLM providers for chain 'volume_tier' failed: " + errors);
    }

    private String callGroq(String model, String prompt, String systemMessage, boolean responseFormatJson) throws IOException, InterruptedException {
        Map<String, Object> bodyMap = new LinkedHashMap<>();
        bodyMap.put("model", model);

        List<Map<String, String>> messages = new ArrayList<>();
        if (systemMessage != null && !systemMessage.isEmpty()) {
            messages.add(Map.of("role", "system", "content", systemMessage));
        }
        messages.add(Map.of("role", "user", "content", prompt));
        bodyMap.put("messages", messages);
        bodyMap.put("temperature", 0.1);
        bodyMap.put("max_tokens", 3000);

        if (responseFormatJson) {
            bodyMap.put("response_format", Map.of("type", "json_object"));
        }

        String jsonBody = objectMapper.writeValueAsString(bodyMap);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 400 && response.body().contains("json_validate_failed")) {
            log.warn("Groq model '{}' returned 400 json_validate_failed. Retrying call once...", model);
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        }

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API returned HTTP " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").get(0).path("message").path("content").asText();
        return cleanContent(content);
    }

    private String callGemini(String model, String prompt, String systemMessage) throws IOException, InterruptedException {
        String combinedPrompt = (systemMessage != null && !systemMessage.isEmpty())
                ? systemMessage + "\n\n" + prompt
                : prompt;

        Map<String, Object> contents = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", combinedPrompt)))
                )
        );

        String jsonBody = objectMapper.writeValueAsString(contents);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Gemini API returned HTTP " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        return cleanContent(content);
    }

    private String cleanContent(String content) {
        if (content == null) {
            return "";
        }
        String trimmed = content.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        }
        return trimmed.trim();
    }
}
