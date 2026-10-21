package com.cadence.report.security;

import com.cadence.report.entity.AssessmentReport;
import com.cadence.report.repository.AssessmentReportRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ReportSecurityIntegrationTest {

    private static final String TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String TEST_ISSUER = "https://auth.test.cadence.ai/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";
    private static final String TEST_INTERNAL_KEY = "internal-secret-for-tests-must-be-at-least-32-bytes-long";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AssessmentReportRepository reportRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID learnerAId;
    private UUID learnerBId;
    private UUID sessionAId;
    private UUID sessionBId;
    private UUID reportAId;
    private UUID reportBId;

    @BeforeEach
    void setUp() {
        reportRepository.deleteAll();
        jdbcTemplate.execute("DELETE FROM assessment_sessions");

        learnerAId = UUID.randomUUID();
        learnerBId = UUID.randomUUID();
        sessionAId = UUID.randomUUID();
        sessionBId = UUID.randomUUID();
        reportAId = UUID.randomUUID();
        reportBId = UUID.randomUUID();

        // Populate assessment_sessions directly via jdbcTemplate to verify read-only projection
        jdbcTemplate.update(
                "INSERT INTO assessment_sessions (id, user_id, status) VALUES (?, ?, ?)",
                sessionAId, learnerAId, "completed"
        );
        jdbcTemplate.update(
                "INSERT INTO assessment_sessions (id, user_id, status) VALUES (?, ?, ?)",
                sessionBId, learnerBId, "completed"
        );

        // Populate reports
        reportRepository.save(AssessmentReport.builder()
                .id(reportAId)
                .assessmentSessionId(sessionAId)
                .overallScore(85)
                .cefrLevel("B2")
                .transcription("Learner A speech")
                .createdAt(OffsetDateTime.now())
                .build());

        reportRepository.save(AssessmentReport.builder()
                .id(reportBId)
                .assessmentSessionId(sessionBId)
                .overallScore(92)
                .cefrLevel("C1")
                .transcription("Learner B speech")
                .createdAt(OffsetDateTime.now())
                .build());
    }

    private String createToken(UUID userId, String email, String role, long expirySeconds) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role)
                .issuer(TEST_ISSUER)
                .audience().add(TEST_AUDIENCE).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirySeconds)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    @Test
    @DisplayName("Report retrieval without Authorization header is rejected with 401")
    void testGetReportWithoutAuthReturns401() throws Exception {
        mockMvc.perform(get("/api/assessment/results/{sessionId}", sessionAId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Report retrieval with invalid/tampered JWT is rejected with 401")
    void testGetReportWithInvalidTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/assessment/results/{sessionId}", sessionAId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Report retrieval with expired JWT is rejected with 401")
    void testGetReportWithExpiredTokenReturns401() throws Exception {
        String expiredToken = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", -3600);
        mockMvc.perform(get("/api/assessment/results/{sessionId}", sessionAId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Learner A can retrieve their own report (200 OK)")
    void testLearnerCanRetrieveOwnReport() throws Exception {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);

        mockMvc.perform(get("/api/assessment/results/{sessionId}", sessionAId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reportAId.toString()))
                .andExpect(jsonPath("$.assessment_session_id").value(sessionAId.toString()))
                .andExpect(jsonPath("$.overall_score").value(85))
                .andExpect(jsonPath("$.cefr_level").value("B2"));
    }

    @Test
    @DisplayName("Learner A can retrieve their own report with ES256 token (200 OK)")
    void testLearnerCanRetrieveOwnReportWithEs256Token() throws Exception {
        String tokenA = com.cadence.security.test.JwtTestTokenHelper.createDefaultEcToken(learnerAId, "learnerA@cadence.ai", "authenticated");

        mockMvc.perform(get("/api/assessment/results/{sessionId}", sessionAId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reportAId.toString()))
                .andExpect(jsonPath("$.assessment_session_id").value(sessionAId.toString()))
                .andExpect(jsonPath("$.overall_score").value(85))
                .andExpect(jsonPath("$.cefr_level").value("B2"));
    }

    @Test
    @DisplayName("Learner A CANNOT retrieve Learner B's report (strict ownership: returns 404, not 403, preventing enumeration)")
    void testLearnerCannotRetrieveOtherLearnerReport() throws Exception {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);

        mockMvc.perform(get("/api/assessment/results/{sessionId}", sessionBId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Retrieval of nonexistent session returns 404")
    void testNonexistentSessionReturns404() throws Exception {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);
        UUID randomSessionId = UUID.randomUUID();

        mockMvc.perform(get("/api/assessment/results/{sessionId}", randomSessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Learner JWT CANNOT create a report on internal endpoint (403 Forbidden)")
    void testLearnerCannotCreateReport() throws Exception {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);
        String payload = """
                {
                    "assessmentSessionId": "%s",
                    "overallScore": 88
                }
                """.formatted(sessionAId);

        mockMvc.perform(post("/api/assessment/reports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Missing internal credentials on report creation returns 401")
    void testCreateReportMissingCredentialsReturns401() throws Exception {
        String payload = """
                {
                    "assessmentSessionId": "%s",
                    "overallScore": 88
                }
                """.formatted(sessionAId);

        mockMvc.perform(post("/api/assessment/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Invalid internal credentials on report creation returns 401")
    void testCreateReportInvalidCredentialsReturns401() throws Exception {
        String payload = """
                {
                    "assessmentSessionId": "%s",
                    "overallScore": 88
                }
                """.formatted(sessionAId);

        mockMvc.perform(post("/api/assessment/reports")
                        .header("X-Internal-Service-Key", "wrong-internal-service-key-wrong-wrong-wrong")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Valid internal credentials can create report (201 Created)")
    void testValidInternalCredentialsCreatesReport() throws Exception {
        UUID newSessionId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO assessment_sessions (id, user_id, status) VALUES (?, ?, ?)",
                newSessionId, learnerAId, "in_progress"
        );

        String payload = """
                {
                    "assessmentSessionId": "%s",
                    "overallScore": 90,
                    "pronunciationScore": 88,
                    "fluencyScore": 91,
                    "clarityScore": 89,
                    "grammarScore": 92,
                    "vocabularyScore": 90,
                    "confidenceScore": 87,
                    "cefrLevel": "C1",
                    "transcription": "Created via internal ML service",
                    "wpm": 140
                }
                """.formatted(newSessionId);

        mockMvc.perform(post("/api/assessment/reports")
                        .header("X-Internal-Service-Key", TEST_INTERNAL_KEY)
                        .header("X-Service-Name", "ml-audio")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.assessment_session_id").value(newSessionId.toString()))
                .andExpect(jsonPath("$.overall_score").value(90))
                .andExpect(jsonPath("$.cefr_level").value("C1"));
    }

    @Test
    @DisplayName("Public health endpoints are accessible without credentials")
    void testPublicHealthEndpointsAccessible() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("report-service"));

        // Actuator health is accessible unauthenticated (returns 200 if brokers up, or 503 if broker is down during tests, but never 401/403)
        int actuatorStatus = mockMvc.perform(get("/actuator/health"))
                .andReturn().getResponse().getStatus();
        org.junit.jupiter.api.Assertions.assertTrue(actuatorStatus == 200 || actuatorStatus == 503,
                "Expected 200 or 503 from unauthenticated actuator health, but got: " + actuatorStatus);
    }

    @Test
    @DisplayName("Direct access to report-service on undefined/arbitrary paths fails closed")
    void testDirectAccessToUnmappedPathFailsClosed() throws Exception {
        mockMvc.perform(get("/admin/internal-dump"))
                .andExpect(status().isUnauthorized());
    }
}
