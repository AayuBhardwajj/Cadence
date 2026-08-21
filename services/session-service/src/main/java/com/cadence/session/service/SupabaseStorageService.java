package com.cadence.session.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
@Slf4j
public class SupabaseStorageService {

    private final String supabaseUrl;
    private final String serviceRoleKey;
    private final String bucketName;
    private final int defaultExpirySeconds;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SupabaseStorageService(
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.service-role-key}") String serviceRoleKey,
            @Value("${supabase.storage.bucket-name:assessment-recordings}") String bucketName,
            @Value("${supabase.storage.signed-url-expiry-seconds:3600}") int defaultExpirySeconds,
            ObjectMapper objectMapper
    ) {
        this.supabaseUrl = supabaseUrl.replaceAll("/+$", "");
        this.serviceRoleKey = serviceRoleKey;
        this.bucketName = bucketName;
        this.defaultExpirySeconds = defaultExpirySeconds;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    /**
     * Uploads audio/video binary bytes to the private Supabase Storage bucket.
     *
     * @param storagePath relative object path (e.g. "{userId}/{sessionId}.webm")
     * @param fileBytes   raw file bytes
     * @param contentType MIME type (e.g. "audio/webm", "video/webm")
     * @return the confirmed storage path in the bucket
     */
    public String uploadFile(String storagePath, byte[] fileBytes, String contentType) {
        if (storagePath == null || storagePath.trim().isEmpty()) {
            throw new IllegalArgumentException("Storage path cannot be empty");
        }
        String cleanPath = storagePath.startsWith("/") ? storagePath.substring(1) : storagePath;
        String endpoint = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucketName, cleanPath);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(60))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                    .header("x-upsert", "true")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(fileBytes))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Supabase Storage upload failed with status {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("Storage upload failed with HTTP " + response.statusCode() + ": " + response.body());
            }

            log.info("Successfully uploaded {} bytes to {}/{}", fileBytes.length, bucketName, cleanPath);
            return cleanPath;
        } catch (Exception e) {
            log.error("Exception during Supabase storage upload for {}: {}", cleanPath, e.getMessage(), e);
            throw new RuntimeException("Failed to upload audio to Supabase Storage: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a time-limited signed URL for reading/downloading an object from the private bucket.
     *
     * @param storagePath      relative object path
     * @param expiresInSeconds validity window in seconds (defaults to configured default if <= 0)
     * @return fully qualified signed URL string
     */
    public String createSignedUrl(String storagePath, int expiresInSeconds) {
        if (storagePath == null || storagePath.trim().isEmpty()) {
            throw new IllegalArgumentException("Storage path cannot be empty");
        }
        String cleanPath = storagePath.startsWith("/") ? storagePath.substring(1) : storagePath;
        int expiry = expiresInSeconds > 0 ? expiresInSeconds : defaultExpirySeconds;
        String endpoint = String.format("%s/storage/v1/object/sign/%s/%s", supabaseUrl, bucketName, cleanPath);

        try {
            String requestBody = objectMapper.writeValueAsString(new SignRequest(expiry));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(15))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Supabase signed URL generation failed with status {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("Signed URL generation failed with HTTP " + response.statusCode() + ": " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String rawSignedUrl = root.path("signedURL").asText();
            if (rawSignedUrl == null || rawSignedUrl.isEmpty()) {
                throw new RuntimeException("Invalid signed URL response: " + response.body());
            }

            // Construct full URL ensuring /storage/v1 prefix is preserved
            String fullUrl;
            if (rawSignedUrl.startsWith("http")) {
                fullUrl = rawSignedUrl;
            } else if (rawSignedUrl.startsWith("/storage/v1")) {
                fullUrl = supabaseUrl + rawSignedUrl;
            } else {
                fullUrl = supabaseUrl + "/storage/v1" + (rawSignedUrl.startsWith("/") ? rawSignedUrl : "/" + rawSignedUrl);
            }

            log.info("Generated signed URL for {}/{} (expires in {}s)", bucketName, cleanPath, expiry);
            return fullUrl;
        } catch (Exception e) {
            log.error("Exception generating signed URL for {}: {}", cleanPath, e.getMessage(), e);
            throw new RuntimeException("Failed to generate signed URL: " + e.getMessage(), e);
        }
    }

    private record SignRequest(int expiresIn) {}
}
