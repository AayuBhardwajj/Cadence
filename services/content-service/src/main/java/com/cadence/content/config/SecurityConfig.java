package com.cadence.content.config;

import com.cadence.content.security.CurrentLearnerIdArgumentResolver;
import com.cadence.security.filter.CadenceInternalAuthFilter;
import com.cadence.security.filter.CadenceJwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

/**
 * Content-service security filter chain.
 *
 * Uses cadence-security-starter's CadenceJwtAuthenticationFilter for
 * cryptographic JWT signature verification (DECISIONS.md D27).
 * The old LearnerAuthFilter (base64-decode-only) is RETIRED — it is no
 * longer registered or referenced here.
 *
 * Route policy (order matters — Spring Security evaluates first-match):
 *   Public (no token required):
 *     GET /health, GET /actuator/health, /error, OPTIONS *
 *     GET /api/courses            (catalogue)
 *     GET /api/courses/{id}       (single published course)
 *     GET /api/lessons/{id}       (published lesson)
 *   Authenticated learner (ROLE_LEARNER, i.e. a valid signed Supabase JWT):
 *     POST /api/courses/{id}/enroll
 *     GET  /api/courses/{id}/progress   — ordered BEFORE the broad GET /api/courses/** public rule
 *     POST /api/lessons/{id}/complete
 *     POST /api/exercises/{id}/attempt
 *     ALL  /api/drills/**
 *     POST /api/passages/generate
 *     GET  /api/tip-of-the-day
 *   Everything else: denyAll()
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig implements WebMvcConfigurer {

    @Value("${cadence.cors.allowed-origins:http://localhost:5173,http://localhost:5174}")
    private String allowedOriginsStr;

    /**
     * Injected from cadence-security-starter auto-config.
     * CadenceJwtAuthenticationFilter performs full HMAC/ECDSA signature
     * verification, issuer, audience and expiry checks before setting the
     * SecurityContext. The old LearnerAuthFilter is NOT registered.
     */
    private final CadenceJwtAuthenticationFilter cadenceJwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 401 on unauthenticated access to protected routes (not 403)
            .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> auth
                // ---- Public ----
                .requestMatchers("/health", "/actuator/health", "/error").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Public course catalogue and single published course
                .requestMatchers(HttpMethod.GET, "/api/courses").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/courses/*").permitAll()
                // Public lesson reads
                .requestMatchers(HttpMethod.GET, "/api/lessons/*").permitAll()

                // ---- Authenticated learner ----
                // These MUST be ordered before any broader public rule that
                // would swallow them (e.g. /api/courses/* above is too broad
                // for the enroll/progress sub-paths — use explicit paths).
                .requestMatchers(HttpMethod.POST, "/api/courses/*/enroll").hasRole("LEARNER")
                .requestMatchers(HttpMethod.GET, "/api/courses/*/progress").hasRole("LEARNER")
                .requestMatchers(HttpMethod.POST, "/api/lessons/*/complete").hasRole("LEARNER")
                .requestMatchers(HttpMethod.POST, "/api/exercises/*/attempt").hasRole("LEARNER")
                // All drill endpoints require auth (D28)
                .requestMatchers("/api/drills/**").hasRole("LEARNER")
                // Passage generation requires auth (B1 ownership check)
                .requestMatchers(HttpMethod.POST, "/api/passages/**").hasRole("LEARNER")
                // Tip of the day requires auth (B2)
                .requestMatchers(HttpMethod.GET, "/api/tip-of-the-day").hasRole("LEARNER")

                // ---- Deny all other routes ----
                .anyRequest().denyAll()
            )
            // CadenceJwtAuthenticationFilter from the starter validates the JWT signature.
            // It runs before UsernamePasswordAuthenticationFilter (which is a no-op here).
            .addFilterBefore(cadenceJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Disable registration of CadenceJwtAuthenticationFilter as a global servlet filter bean.
     * The filter is registered exclusively within the Spring Security filter chain via addFilterBefore
     * to prevent double-invocation of authentication checks (D27).
     */
    @Bean
    public FilterRegistrationBean<CadenceJwtAuthenticationFilter> cadenceJwtAuthenticationFilterRegistration(
            CadenceJwtAuthenticationFilter filter
    ) {
        FilterRegistrationBean<CadenceJwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    /**
     * Disable registration of CadenceInternalAuthFilter as a global servlet filter bean.
     * Content-service disables internal service auth (cadence.security.internal.enabled=false)
     * and does not place it in the security chain; disabling servlet registration prevents
     * Tomcat from executing it at the servlet container level.
     */
    @Bean
    public FilterRegistrationBean<CadenceInternalAuthFilter> cadenceInternalAuthFilterRegistration(
            CadenceInternalAuthFilter filter
    ) {
        FilterRegistrationBean<CadenceInternalAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    /**
     * Registers the local CurrentLearnerIdArgumentResolver for the local
     * com.cadence.content.security.CurrentLearnerId annotation.
     * Supports required=false for optional learner identity on public endpoints.
     * Coexists alongside the starter's separate resolver for the starter's annotation.
     */
    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentLearnerIdArgumentResolver());
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOriginsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        // Allow Authorization header through CORS preflights
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

