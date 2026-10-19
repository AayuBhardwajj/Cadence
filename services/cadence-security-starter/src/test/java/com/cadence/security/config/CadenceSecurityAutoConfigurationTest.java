package com.cadence.security.config;

import com.cadence.security.annotation.CurrentLearnerArgumentResolver;
import com.cadence.security.filter.CadenceInternalAuthFilter;
import com.cadence.security.filter.CadenceJwtAuthenticationFilter;
import com.cadence.security.jwt.JwtValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class CadenceSecurityAutoConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(CadenceSecurityAutoConfiguration.class));

    @Test
    @DisplayName("Auto-configuration succeeds and registers all beans when valid properties are supplied")
    void testAutoConfigurationWithProperties() {
        contextRunner
                .withPropertyValues(
                        "cadence.security.jwt.algorithm=HS256",
                        "cadence.security.jwt.secret=01234567890123456789012345678901",
                        "cadence.security.jwt.issuer=https://test.supabase.co/auth/v1",
                        "cadence.security.jwt.audience=authenticated",
                        "cadence.security.internal.secret=internal-service-secret-12345"
                )
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(CadenceSecurityProperties.class);
                    assertThat(context).hasSingleBean(JwtValidator.class);
                    assertThat(context).hasSingleBean(CadenceJwtAuthenticationFilter.class);
                    assertThat(context).hasSingleBean(CadenceInternalAuthFilter.class);
                    assertThat(context).hasSingleBean(CurrentLearnerArgumentResolver.class);
                });
    }

    @Test
    @DisplayName("Auto-configuration fails closed when required properties are missing")
    void testAutoConfigurationFailsWithoutProperties() {
        contextRunner.run(context -> {
            assertThat(context).hasFailed();
        });
    }
}
