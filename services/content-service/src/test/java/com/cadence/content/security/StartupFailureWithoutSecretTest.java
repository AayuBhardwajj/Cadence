package com.cadence.content.security;

import com.cadence.content.ContentServiceApplication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StartupFailureWithoutSecretTest {

    @Test
    @DisplayName("Startup fails when cadence.security.jwt.secret is blank with no asymmetric key (fail-closed)")
    void contextFailsToStartWithoutSecret() {
        SpringApplicationBuilder app = new SpringApplicationBuilder(ContentServiceApplication.class)
                .properties(
                        "server.port=0",
                        "cadence.security.jwt.secret=",
                        "cadence.security.jwt.issuer=https://auth.test.cadence.ai/auth/v1",
                        "cadence.security.jwt.audience=authenticated",
                        "cadence.security.jwt.allowed-algorithms=HS256",
                        "cadence.security.internal.enabled=false",
                        "spring.datasource.url=jdbc:h2:mem:fail-closed-db;DB_CLOSE_DELAY=-1",
                        "spring.datasource.driver-class-name=org.h2.Driver",
                        "spring.datasource.username=sa",
                        "spring.datasource.password=",
                        "spring.jpa.hibernate.ddl-auto=none"
                );

        assertThatThrownBy(app::run)
                .isNotNull()
                .hasRootCauseMessage("JWT secret (cadence.security.jwt.secret) must not be blank when HMAC algorithms are allowed");
    }
}

