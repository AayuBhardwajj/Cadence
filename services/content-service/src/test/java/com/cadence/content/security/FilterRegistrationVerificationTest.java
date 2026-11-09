package com.cadence.content.security;

import com.cadence.security.filter.CadenceInternalAuthFilter;
import com.cadence.security.filter.CadenceJwtAuthenticationFilter;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterRegistration;
import jakarta.servlet.ServletContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.ApplicationContext;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves that neither CadenceJwtAuthenticationFilter nor CadenceInternalAuthFilter
 * are registered directly in the servlet container, but exist as FilterRegistrationBeans
 * with isEnabled() == false (FIX 2).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "cadence.security.jwt.secret=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "cadence.security.jwt.issuer=https://auth.test.cadence.ai/auth/v1",
        "cadence.security.jwt.audience=authenticated",
        "cadence.security.jwt.allowed-algorithms=HS256",
        "cadence.security.internal.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:filter-reg-test-db;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
})
class FilterRegistrationVerificationTest {

    private static final Logger log = LoggerFactory.getLogger(FilterRegistrationVerificationTest.class);

    @Autowired
    private ServletContext servletContext;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private FilterChainProxy filterChainProxy;

    @Test
    @DisplayName("Verify CadenceJwtAuthenticationFilter and CadenceInternalAuthFilter are disabled in servlet container")
    void verifyFilterRegistrationDisabledInServletContainer() {
        // 1. Verify FilterRegistrationBean exists and isEnabled == false for JWT filter
        @SuppressWarnings("unchecked")
        FilterRegistrationBean<CadenceJwtAuthenticationFilter> jwtReg =
                (FilterRegistrationBean<CadenceJwtAuthenticationFilter>) applicationContext.getBean(
                        "cadenceJwtAuthenticationFilterRegistration", FilterRegistrationBean.class);

        assertThat(jwtReg).isNotNull();
        assertThat(jwtReg.isEnabled()).isFalse();

        // 2. Verify FilterRegistrationBean exists and isEnabled == false for Internal filter
        @SuppressWarnings("unchecked")
        FilterRegistrationBean<CadenceInternalAuthFilter> internalReg =
                (FilterRegistrationBean<CadenceInternalAuthFilter>) applicationContext.getBean(
                        "cadenceInternalAuthFilterRegistration", FilterRegistrationBean.class);

        assertThat(internalReg).isNotNull();
        assertThat(internalReg.isEnabled()).isFalse();

        // 3. Inspect all servlet container filter registrations
        Map<String, ? extends FilterRegistration> filterRegistrations = servletContext.getFilterRegistrations();
        log.info("Registered servlet container filters count: {}", filterRegistrations.size());

        for (Map.Entry<String, ? extends FilterRegistration> entry : filterRegistrations.entrySet()) {
            String filterName = entry.getKey();
            String className = entry.getValue().getClassName();
            log.info("Servlet filter: name='{}', class='{}'", filterName, className);

            // Assert that neither filter is registered directly in the servlet container
            assertThat(className)
                    .withFailMessage("CadenceJwtAuthenticationFilter must not be registered as a servlet container filter")
                    .doesNotContain("CadenceJwtAuthenticationFilter");
            assertThat(className)
                    .withFailMessage("CadenceInternalAuthFilter must not be registered as a servlet container filter")
                    .doesNotContain("CadenceInternalAuthFilter");
        }
    }

    @Test
    @DisplayName("Verify security filter chain order: CadenceJwtAuthenticationFilter before AuthorizationFilter and no CadenceInternalAuthFilter")
    void verifySecurityFilterChainOrder() {
        List<SecurityFilterChain> chains = filterChainProxy.getFilterChains();
        assertThat(chains).isNotEmpty();

        SecurityFilterChain chain = chains.get(0);
        List<Filter> filters = chain.getFilters();

        int internalIndex = -1;
        int jwtIndex = -1;
        int authzIndex = -1;

        for (int i = 0; i < filters.size(); i++) {
            Filter f = filters.get(i);
            if (f instanceof CadenceInternalAuthFilter) {
                internalIndex = i;
            } else if (f instanceof CadenceJwtAuthenticationFilter) {
                jwtIndex = i;
            } else if (f instanceof AuthorizationFilter) {
                authzIndex = i;
            }
        }

        assertThat(internalIndex).withFailMessage("CadenceInternalAuthFilter must NOT be in content-service security chain").isEqualTo(-1);
        assertThat(jwtIndex).withFailMessage("CadenceJwtAuthenticationFilter must be in the security chain").isGreaterThanOrEqualTo(0);
        assertThat(authzIndex).withFailMessage("AuthorizationFilter must be in the security chain").isGreaterThanOrEqualTo(0);
        assertThat(jwtIndex).withFailMessage("CadenceJwtAuthenticationFilter must precede AuthorizationFilter").isLessThan(authzIndex);
    }
}
