package com.cadence.content.config;

import com.cadence.content.security.CurrentLearnerIdArgumentResolver;
import com.cadence.content.security.LearnerAuthFilter;
import org.springframework.beans.factory.annotation.Value;
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

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig implements WebMvcConfigurer {

    @Value("${cadence.cors.allowed-origins:http://localhost:5173,http://localhost:5174}")
    private String allowedOriginsStr;

    @Bean
    public LearnerAuthFilter learnerAuthFilter() {
        return new LearnerAuthFilter();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health", "/actuator/health").permitAll()
                // Public catalog and content endpoints
                .requestMatchers(HttpMethod.GET, "/api/courses", "/api/courses/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/lessons/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tip-of-the-day").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/passages/**").permitAll()
                // Learner-protected endpoints
                .requestMatchers(HttpMethod.POST, "/api/courses/*/enroll").hasRole("LEARNER")
                .requestMatchers(HttpMethod.GET, "/api/courses/*/progress").hasRole("LEARNER")
                .requestMatchers(HttpMethod.POST, "/api/lessons/*/complete").hasRole("LEARNER")
                .requestMatchers(HttpMethod.POST, "/api/exercises/*/attempt").hasRole("LEARNER")
                .anyRequest().permitAll()
            )
            .addFilterBefore(learnerAuthFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

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
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
