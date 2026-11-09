package com.cadence.content.security;

import com.cadence.security.auth.CadenceLearnerAuthenticationToken;
import com.cadence.security.model.LearnerPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CurrentLearnerIdArgumentResolverTest {

    private final CurrentLearnerIdArgumentResolver resolver = new CurrentLearnerIdArgumentResolver();

    // Dummy controller methods for MethodParameter reflection
    void endpointWithRequiredLearner(@CurrentLearnerId UUID learnerId) {}
    void endpointWithOptionalLearner(@CurrentLearnerId(required = false) UUID learnerId) {}

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MethodParameter getMethodParameter(String methodName) throws NoSuchMethodException {
        Method method = getClass().getDeclaredMethod(methodName, UUID.class);
        return new MethodParameter(method, 0);
    }

    @Test
    @DisplayName("Authenticated request: resolves UUID from CadenceLearnerAuthenticationToken")
    void resolvesLearnerIdForAuthenticatedLearner() throws Exception {
        UUID expectedId = UUID.randomUUID();
        LearnerPrincipal principal = new LearnerPrincipal(expectedId, "learner@example.com", "authenticated");
        CadenceLearnerAuthenticationToken authToken = new CadenceLearnerAuthenticationToken(principal);
        SecurityContextHolder.getContext().setAuthentication(authToken);

        MethodParameter parameter = getMethodParameter("endpointWithRequiredLearner");
        Object resolved = resolver.resolveArgument(parameter, null, null, null);

        assertThat(resolved).isEqualTo(expectedId);
    }

    @Test
    @DisplayName("Anonymous request with required=false: returns null without error")
    void returnsNullForOptionalAnonymousCall() throws Exception {
        SecurityContextHolder.clearContext();

        MethodParameter parameter = getMethodParameter("endpointWithOptionalLearner");
        Object resolved = resolver.resolveArgument(parameter, null, null, null);

        assertThat(resolved).isNull();
    }

    @Test
    @DisplayName("Anonymous request with required=true: throws AccessDeniedException")
    void throwsAccessDeniedForRequiredAnonymousCall() throws Exception {
        SecurityContextHolder.clearContext();

        MethodParameter parameter = getMethodParameter("endpointWithRequiredLearner");
        assertThatThrownBy(() -> resolver.resolveArgument(parameter, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Authenticated learner is required");
    }
}

