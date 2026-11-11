package com.cadence.content.security;

import com.cadence.content.dto.CourseDetailDto;
import com.cadence.content.dto.CourseProgressDto;
import com.cadence.content.dto.DrillPlanDto;
import com.cadence.content.dto.DrillPlanItemDto;
import com.cadence.content.dto.LessonDetailDto;
import com.cadence.content.service.CourseService;
import com.cadence.content.service.DrillPlanService;
import com.cadence.content.service.LessonService;
import com.cadence.content.service.PassageService;
import com.cadence.security.test.JwtTestTokenHelper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for the content-service security filter chain.
 *
 * Tests run through the REAL CadenceJwtAuthenticationFilter (not mocked).
 * Tokens are SIGNED inside the test using a test-only secret; the same secret
 * is configured via TestPropertySource so the filter accepts them.
 *
 * Test type: SpringBootTest slice (AutoConfigureMockMvc) — real filter chain,
 * mocked service layer. NOT a database test; no DB is required.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        // Use a test-only HMAC secret — 64 bytes to satisfy HS256 minimum
        "cadence.security.jwt.secret=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "cadence.security.jwt.issuer=https://auth.test.cadence.ai/auth/v1",
        "cadence.security.jwt.audience=authenticated",
        "cadence.security.jwt.allowed-algorithms=HS256",
        "cadence.security.internal.enabled=false",
        // Test H2 datasource (ddl-auto create-drop)
        "spring.datasource.url=jdbc:h2:mem:security-test-db;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
})
class ContentServiceSecurityFilterChainTest {

    private static final String TEST_SECRET =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String TEST_ISSUER = "https://auth.test.cadence.ai/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DrillPlanService drillPlanService;

    @MockBean
    private CourseService courseService;

    @MockBean
    private PassageService passageService;

    @MockBean
    private LessonService lessonService;

    // -------------------------------------------------------------------------
    // Helper: sign a valid token with the test secret
    // -------------------------------------------------------------------------

    private String validToken(UUID userId) {
        return JwtTestTokenHelper.createHmacToken(
                userId, "test@example.com", "authenticated",
                TEST_ISSUER, TEST_AUDIENCE, TEST_SECRET, 3600);
    }

    private String expiredToken(UUID userId) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        return Jwts.builder()
                .subject(userId.toString())
                .issuer(TEST_ISSUER)
                .audience().add(TEST_AUDIENCE).and()
                .issuedAt(Date.from(past.minus(1, ChronoUnit.HOURS)))
                .expiration(Date.from(past))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    private String wrongIssuerToken(UUID userId) {
        return JwtTestTokenHelper.createHmacToken(
                userId, "test@example.com", "authenticated",
                "https://evil.example.com/auth/v1", TEST_AUDIENCE, TEST_SECRET, 3600);
    }

    private String wrongAudienceToken(UUID userId) {
        return JwtTestTokenHelper.createHmacToken(
                userId, "test@example.com", "authenticated",
                TEST_ISSUER, "wrong-audience", TEST_SECRET, 3600);
    }

    private String wrongKeyToken(UUID userId) {
        // Sign with a different key
        return JwtTestTokenHelper.createHmacToken(
                userId, "test@example.com", "authenticated",
                TEST_ISSUER, TEST_AUDIENCE,
                "DIFFERENT_SECRET_KEY_THAT_DOES_NOT_MATCH_32bytes_minimum_length!!",
                3600);
    }

    private String algNoneToken(UUID userId) {
        // Manually construct a token that claims alg=none — JwtValidator must reject it
        String header = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"" + userId + "\",\"iss\":\"" + TEST_ISSUER +
                        "\",\"aud\":\"" + TEST_AUDIENCE + "\",\"exp\":" +
                        (Instant.now().getEpochSecond() + 3600) + "}").getBytes(StandardCharsets.UTF_8));
        return header + "." + payload + ".";
    }

    private String tokenWithRole(UUID userId, String role) {
        return JwtTestTokenHelper.createHmacToken(
                userId, "test@example.com", role,
                TEST_ISSUER, TEST_AUDIENCE, TEST_SECRET, 3600);
    }

    private String tokenWithoutRole(UUID userId) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .issuer(TEST_ISSUER)
                .audience().add(TEST_AUDIENCE).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(1, ChronoUnit.HOURS)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    // =========================================================================
    // A. Valid token accepted
    // =========================================================================

    @Test
    @DisplayName("Valid signed token: POST /api/drills/plan → 200 (service layer reached)")
    void validToken_drillPlanAccepted() throws Exception {
        UUID userId = UUID.randomUUID();
        when(drillPlanService.getOrCreatePlan(any(UUID.class)))
                .thenReturn(DrillPlanDto.builder().status("no_targets").build());

        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken(userId)))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // B. Invalid tokens → 401
    // =========================================================================

    @Test
    @DisplayName("Bad signature → 401")
    void badSignature_returns401() throws Exception {
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + wrongKeyToken(UUID.randomUUID())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Expired token → 401")
    void expiredToken_returns401() throws Exception {
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken(UUID.randomUUID())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Wrong issuer → 401")
    void wrongIssuer_returns401() throws Exception {
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + wrongIssuerToken(UUID.randomUUID())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Wrong audience → 401")
    void wrongAudience_returns401() throws Exception {
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + wrongAudienceToken(UUID.randomUUID())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("alg=none token → 401 (forbidden algorithm)")
    void algNone_returns401() throws Exception {
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + algNoneToken(UUID.randomUUID())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Forged UUID in sub with wrong key → 401 (signature check blocks forged identity)")
    void forgedUuidWrongKey_returns401() throws Exception {
        UUID forgedUserId = UUID.randomUUID(); // attacker picks any UUID
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + wrongKeyToken(forgedUserId)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Unsupported algorithm (HS512 when only HS256 allowed) → 401")
    void unsupportedAlgorithm_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        SecretKey key512 = Keys.hmacShaKeyFor(
                (TEST_SECRET + TEST_SECRET).getBytes(StandardCharsets.UTF_8)); // 128 bytes for HS512
        String hs512Token = Jwts.builder()
                .subject(userId.toString())
                .issuer(TEST_ISSUER)
                .audience().add(TEST_AUDIENCE).and()
                .issuedAt(new Date())
                .expiration(Date.from(Instant.now().plus(1, ChronoUnit.HOURS)))
                .signWith(key512, Jwts.SIG.HS512)
                .compact();

        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + hs512Token))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // C. Anonymous access
    // =========================================================================

    @Test
    @DisplayName("No token on protected drill route → 401")
    void noToken_drillPlan_returns401() throws Exception {
        mockMvc.perform(post("/api/drills/plan"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("No token on tip-of-the-day (now protected) → 401")
    void noToken_tipOfTheDay_returns401() throws Exception {
        mockMvc.perform(get("/api/tip-of-the-day"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // D. Public endpoints still open
    // =========================================================================

    @Test
    @DisplayName("GET /api/courses — public catalogue, no token required → not 401/403")
    void publicCourseList_noToken_allowed() throws Exception {
        // Returns 200 (empty list from H2) or any 2xx — just not 401/403
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("GET /actuator/health — public health endpoint, no token required")
    void publicHealth_noToken_allowed() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().is2xxSuccessful());
    }

    // =========================================================================
    // E. Unknown routes → denyAll (403 when authenticated, 401 when anonymous)
    // =========================================================================

    @Test
    @DisplayName("Unknown route with valid token → 403 (denyAll)")
    void unknownRoute_validToken_returns403() throws Exception {
        UUID userId = UUID.randomUUID();
        mockMvc.perform(get("/api/nonexistent-route")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken(userId)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unknown route without token → 401 (denyAll rejects anonymous request via AuthenticationEntryPoint)")
    void unknownRoute_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/nonexistent-route"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // F. Supabase Role Enforcement Tests (FIX 1 — D27)
    // =========================================================================

    @Test
    @DisplayName("Role enforcement: role 'authenticated' is accepted → 200")
    void tokenRoleAuthenticated_accepted() throws Exception {
        UUID userId = UUID.randomUUID();
        when(drillPlanService.getOrCreatePlan(eq(userId)))
                .thenReturn(DrillPlanDto.builder().status("no_targets").build());

        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenWithRole(userId, "authenticated")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Role enforcement: Supabase anon key (role 'anon') is rejected with 401")
    void tokenRoleAnon_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenWithRole(userId, "anon")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Role enforcement: Supabase service_role key (role 'service_role') is rejected with 401")
    void tokenRoleServiceRole_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenWithRole(userId, "service_role")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Role enforcement: token missing role claim is rejected with 401")
    void tokenMissingRole_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenWithoutRole(userId)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Role enforcement: token with unexpected role 'admin' is rejected with 401")
    void tokenUnexpectedRole_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenWithRole(userId, "admin")))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // G. DrillController JSON snake_case & items Contract Tests (FIX 5)
    // =========================================================================

    @Test
    @DisplayName("DrillPlan JSON: status 'no_targets' returns items: [] (empty list, not null) and snake_case")
    void drillPlan_noTargets_snakeCaseAndEmptyItems() throws Exception {
        UUID userId = UUID.randomUUID();
        DrillPlanDto plan = DrillPlanDto.builder()
                .status("no_targets")
                .build();
        when(drillPlanService.getOrCreatePlan(eq(userId))).thenReturn(plan);

        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("no_targets"))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    @DisplayName("DrillPlan JSON: plan and items contain snake_case keys matching report schema")
    void drillPlan_withItems_snakeCaseKeys() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        DrillPlanItemDto item = DrillPlanItemDto.builder()
                .id(itemId)
                .planId(planId)
                .position(1)
                .level((short) 2)
                .targetKind("onset")
                .targetValue("k")
                .triggerWord("cookie")
                .phraseText("Crispy cookies crunch delightfully")
                .phraseSource("curated")
                .completedAt(null)
                .build();

        DrillPlanDto plan = DrillPlanDto.builder()
                .id(planId)
                .userId(userId)
                .sourceReportId(reportId)
                .status("active")
                .generationSummary(Map.of("target_count", 1))
                .createdAt(OffsetDateTime.now())
                .items(List.of(item))
                .build();

        when(drillPlanService.getOrCreatePlan(eq(userId))).thenReturn(plan);

        mockMvc.perform(post("/api/drills/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user_id").value(userId.toString()))
                .andExpect(jsonPath("$.source_report_id").value(reportId.toString()))
                .andExpect(jsonPath("$.generation_summary.target_count").value(1))
                .andExpect(jsonPath("$.created_at").isNotEmpty())
                .andExpect(jsonPath("$.items[0].plan_id").value(planId.toString()))
                .andExpect(jsonPath("$.items[0].target_kind").value("onset"))
                .andExpect(jsonPath("$.items[0].target_value").value("k"))
                .andExpect(jsonPath("$.items[0].trigger_word").value("cookie"))
                .andExpect(jsonPath("$.items[0].phrase_text").value("Crispy cookies crunch delightfully"))
                .andExpect(jsonPath("$.items[0].phrase_source").value("curated"));
    }

    // =========================================================================
    // H. Route Authorization Matrix Tests (FIX 5)
    // =========================================================================

    @Test
    @DisplayName("Anonymous GET /api/courses/{id}/progress → 401")
    void anonymous_getCourseProgress_returns401() throws Exception {
        mockMvc.perform(get("/api/courses/" + UUID.randomUUID() + "/progress"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authenticated GET /api/courses/{id}/progress reaches controller")
    void authenticated_getCourseProgress_reachesController() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        when(courseService.getCourseProgress(courseId, userId))
                .thenReturn(CourseProgressDto.builder().courseId(courseId).build());

        mockMvc.perform(get("/api/courses/" + courseId + "/progress")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken(userId)))
                .andExpect(status().isOk());
        verify(courseService).getCourseProgress(courseId, userId);
    }

    @Test
    @DisplayName("Anonymous POST /api/courses/{id}/enroll → 401")
    void anonymous_postCourseEnroll_returns401() throws Exception {
        mockMvc.perform(post("/api/courses/" + UUID.randomUUID() + "/enroll"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Anonymous POST /api/passages/generate → 401")
    void anonymous_postPassageGenerate_returns401() throws Exception {
        mockMvc.perform(post("/api/passages/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"topic\":\"workplace\",\"difficulty\":\"medium\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Anonymous GET /api/courses/{id} is public → not 401/403")
    void anonymous_getCourseById_allowed() throws Exception {
        UUID courseId = UUID.randomUUID();
        when(courseService.getCourseDetail(courseId, null))
                .thenReturn(CourseDetailDto.builder().id(courseId).title("Test Course").build());

        mockMvc.perform(get("/api/courses/" + courseId))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Anonymous GET /api/lessons/{id} is public → not 401/403")
    void anonymous_getLessonById_allowed() throws Exception {
        UUID lessonId = UUID.randomUUID();
        when(lessonService.getLessonDetail(lessonId, null))
                .thenReturn(LessonDetailDto.builder().id(lessonId).title("Test Lesson").build());

        mockMvc.perform(get("/api/lessons/" + lessonId))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Anonymous POST /api/drills/plan/items/{id}/attempt → 401")
    void anonymous_recordAttempt_returns401() throws Exception {
        mockMvc.perform(post("/api/drills/plan/items/" + UUID.randomUUID() + "/attempt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"passed\":true}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authenticated POST /api/drills/plan/items/{id}/attempt → 200")
    void authenticated_recordAttempt_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        when(drillPlanService.recordAttempt(eq(itemId), any(UUID.class), eq(true)))
                .thenReturn(DrillPlanItemDto.builder().id(itemId).attempts(1).passedAttempts(1).build());

        mockMvc.perform(post("/api/drills/plan/items/" + itemId + "/attempt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken(userId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"passed\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attempts").value(1))
                .andExpect(jsonPath("$.passed_attempts").value(1));
    }

    @Test
    @DisplayName("CORS preflight OPTIONS with Authorization header from allowed origin returns 2xx and allow headers")
    void corsPreflight_options_allowedOrigin_success() throws Exception {
        mockMvc.perform(options("/api/drills/plan")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}

