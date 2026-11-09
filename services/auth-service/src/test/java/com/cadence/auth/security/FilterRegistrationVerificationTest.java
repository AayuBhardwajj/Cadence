package com.cadence.auth.security;

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
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
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
    void verifyFiltersDisabledInServletContainer() {
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
        Map<String, ? extends FilterRegistration> registrations = servletContext.getFilterRegistrations();
        for (Map.Entry<String, ? extends FilterRegistration> entry : registrations.entrySet()) {
            String className = entry.getValue().getClassName();
            assertThat(className)
                    .withFailMessage("CadenceJwtAuthenticationFilter must not be registered as a servlet container filter")
                    .doesNotContain("CadenceJwtAuthenticationFilter");
            assertThat(className)
                    .withFailMessage("CadenceInternalAuthFilter must not be registered as a servlet container filter")
                    .doesNotContain("CadenceInternalAuthFilter");
        }
    }

    @Test
    @DisplayName("Verify security filter chain order: CadenceInternalAuthFilter before CadenceJwtAuthenticationFilter before AuthorizationFilter")
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

        assertThat(internalIndex).withFailMessage("CadenceInternalAuthFilter must be in the security chain").isGreaterThanOrEqualTo(0);
        assertThat(jwtIndex).withFailMessage("CadenceJwtAuthenticationFilter must be in the security chain").isGreaterThanOrEqualTo(0);
        assertThat(authzIndex).withFailMessage("AuthorizationFilter must be in the security chain").isGreaterThanOrEqualTo(0);

        assertThat(internalIndex).withFailMessage("CadenceInternalAuthFilter must precede CadenceJwtAuthenticationFilter").isLessThan(jwtIndex);
        assertThat(jwtIndex).withFailMessage("CadenceJwtAuthenticationFilter must precede AuthorizationFilter").isLessThan(authzIndex);
    }
}
