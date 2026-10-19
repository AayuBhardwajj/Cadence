package com.cadence.security.config;

import com.cadence.security.annotation.CurrentLearnerArgumentResolver;
import com.cadence.security.filter.CadenceInternalAuthFilter;
import com.cadence.security.filter.CadenceJwtAuthenticationFilter;
import com.cadence.security.jwt.JwtValidator;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Spring Boot auto-configuration for Cadence security starter.
 * Automatically registers JWT validator, security filters, and parameter resolvers.
 */
@AutoConfiguration
@EnableConfigurationProperties(CadenceSecurityProperties.class)
public class CadenceSecurityAutoConfiguration implements WebMvcConfigurer {

    @Bean
    @ConditionalOnMissingBean
    public JwtValidator jwtValidator(CadenceSecurityProperties properties) {
        return new JwtValidator(properties);
    }

    @Bean
    @ConditionalOnMissingBean
    public CadenceJwtAuthenticationFilter cadenceJwtAuthenticationFilter(JwtValidator jwtValidator) {
        return new CadenceJwtAuthenticationFilter(jwtValidator);
    }

    @Bean
    @ConditionalOnMissingBean
    public CadenceInternalAuthFilter cadenceInternalAuthFilter(CadenceSecurityProperties properties) {
        return new CadenceInternalAuthFilter(properties);
    }

    @Bean
    @ConditionalOnMissingBean
    public CurrentLearnerArgumentResolver currentLearnerArgumentResolver() {
        return new CurrentLearnerArgumentResolver();
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentLearnerArgumentResolver());
    }
}
