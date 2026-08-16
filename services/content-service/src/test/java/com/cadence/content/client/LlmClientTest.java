package com.cadence.content.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LlmClientTest {

    private HttpClient httpClient;
    private HttpResponse<String> httpResponse;
    private ObjectMapper objectMapper;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        httpClient = mock(HttpClient.class);
        httpResponse = (HttpResponse<String>) mock(HttpResponse.class);
        objectMapper = new ObjectMapper();
    }

    @Test
    void testThrowsWhenNoKeysConfigured() {
        LlmClient client = new LlmClient("", "", httpClient, objectMapper);
        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                client.callVolumeTier("hello", "system", false)
        );
        assertTrue(ex.getMessage().contains("All LLM providers for chain 'volume_tier' failed"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void testGroqSuccessReturnsCleanContent() throws IOException, InterruptedException {
        String groqJson = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "```json\\n{\\"passage\\": \\"Ideal workplace text.\\"}\\n```"
                      }
                    }
                  ]
                }
                """;

        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(groqJson);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(httpResponse);

        LlmClient client = new LlmClient("mock-groq-key", "", httpClient, objectMapper);
        String result = client.callVolumeTier("generate", "system", true);

        assertEquals("{\"passage\": \"Ideal workplace text.\"}", result);
        verify(httpClient, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void testFallbackToGeminiWhenGroqThrows() throws IOException, InterruptedException {
        HttpResponse<String> groqFailResp = (HttpResponse<String>) mock(HttpResponse.class);
        when(groqFailResp.statusCode()).thenReturn(429);
        when(groqFailResp.body()).thenReturn("{\"error\": {\"message\": \"Rate limit reached\"}}");

        HttpResponse<String> geminiSuccessResp = (HttpResponse<String>) mock(HttpResponse.class);
        when(geminiSuccessResp.statusCode()).thenReturn(200);
        when(geminiSuccessResp.body()).thenReturn("""
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {"text": "Gemini generated tip text"}
                        ]
                      }
                    }
                  ]
                }
                """);

        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(groqFailResp)
                .thenReturn(geminiSuccessResp);

        LlmClient client = new LlmClient("mock-groq-key", "mock-gemini-key", httpClient, objectMapper);
        String result = client.callVolumeTier("prompt", "system", false);

        assertEquals("Gemini generated tip text", result);
        // First request to Groq, second request to Gemini
        verify(httpClient, times(2)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void testGroqJsonValidateFailedSingleRetrySuccess() throws IOException, InterruptedException {
        // Attempt 1: 400 with json_validate_failed (D9 mitigation)
        HttpResponse<String> groqValidationFailResp = (HttpResponse<String>) mock(HttpResponse.class);
        when(groqValidationFailResp.statusCode()).thenReturn(400);
        when(groqValidationFailResp.body()).thenReturn("{\"error\": {\"message\": \"Failed to validate JSON: json_validate_failed\"}}");

        // Attempt 2: 200 success on single retry
        HttpResponse<String> groqSuccessResp = (HttpResponse<String>) mock(HttpResponse.class);
        when(groqSuccessResp.statusCode()).thenReturn(200);
        when(groqSuccessResp.body()).thenReturn("""
                {
                  "choices": [
                    {
                      "message": {
                        "content": "{\\"passage\\": \\"Retried valid JSON passage\\"}"
                      }
                    }
                  ]
                }
                """);

        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(groqValidationFailResp)
                .thenReturn(groqSuccessResp);

        LlmClient client = new LlmClient("mock-groq-key", "", httpClient, objectMapper);
        String result = client.callVolumeTier("prompt", "system", true);

        assertEquals("{\"passage\": \"Retried valid JSON passage\"}", result);
        // Confirms exactly 2 calls to Groq (initial + 1 retry)
        verify(httpClient, times(2)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void testGroqBare400DoesNotRetryAndFallsBack() throws IOException, InterruptedException {
        // Bare 400 without json_validate_failed should NOT trigger Groq retry
        HttpResponse<String> groqBare400Resp = (HttpResponse<String>) mock(HttpResponse.class);
        when(groqBare400Resp.statusCode()).thenReturn(400);
        when(groqBare400Resp.body()).thenReturn("{\"error\": {\"message\": \"Invalid parameter foo\"}}");

        HttpResponse<String> geminiSuccessResp = (HttpResponse<String>) mock(HttpResponse.class);
        when(geminiSuccessResp.statusCode()).thenReturn(200);
        when(geminiSuccessResp.body()).thenReturn("""
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {"text": "Gemini fallback text"}
                        ]
                      }
                    }
                  ]
                }
                """);

        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(groqBare400Resp)
                .thenReturn(geminiSuccessResp);

        LlmClient client = new LlmClient("mock-groq-key", "mock-gemini-key", httpClient, objectMapper);
        String result = client.callVolumeTier("prompt", "system", false);

        assertEquals("Gemini fallback text", result);
        // Exactly 2 total calls: 1 to Groq (no retry on bare 400) + 1 to Gemini
        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient, times(2)).send(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));

        assertTrue(requestCaptor.getAllValues().get(0).uri().toString().contains("groq.com"));
        assertTrue(requestCaptor.getAllValues().get(1).uri().toString().contains("googleapis.com"));
    }
}
