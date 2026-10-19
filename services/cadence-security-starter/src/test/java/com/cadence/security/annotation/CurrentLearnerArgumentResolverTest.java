package com.cadence.security.annotation;

import com.cadence.security.auth.CadenceInternalAuthenticationToken;
import com.cadence.security.auth.CadenceLearnerAuthenticationToken;
import com.cadence.security.model.InternalServicePrincipal;
import com.cadence.security.model.LearnerPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.lang.reflect.Method;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class CurrentLearnerArgumentResolverTest {

    private CurrentLearnerArgumentResolver resolver;

    public void sampleMethod(
            @CurrentLearnerId UUID learnerId,
            @CurrentLearnerId String learnerIdStr,
            @CurrentLearner LearnerPrincipal learner,
            String unannotatedParam
    ) {
    }

    @BeforeEach
    void setUp() {
        resolver = new CurrentLearnerArgumentResolver();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MethodParameter getMethodParameter(int index) throws NoSuchMethodException {
        Method method = getClass().getMethod("sampleMethod", UUID.class, String.class, LearnerPrincipal.class, String.class);
        return new MethodParameter(method, index);
    }

    @Test
    @DisplayName("supportsParameter correctly detects @CurrentLearnerId and @CurrentLearner")
    void testSupportsParameter() throws NoSuchMethodException {
        assertTrue(resolver.supportsParameter(getMethodParameter(0))); // UUID
        assertTrue(resolver.supportsParameter(getMethodParameter(1))); // String
        assertTrue(resolver.supportsParameter(getMethodParameter(2))); // LearnerPrincipal
        assertFalse(resolver.supportsParameter(getMethodParameter(3))); // unannotated
    }

    @Test
    @DisplayName("Successfully resolves UUID and LearnerPrincipal for authenticated learner")
    void testResolvesLearnerSuccessfully() throws Exception {
        UUID expectedId = UUID.randomUUID();
        LearnerPrincipal principal = new LearnerPrincipal(expectedId, "test@cadence.ai", "authenticated");
        SecurityContextHolder.getContext().setAuthentication(new CadenceLearnerAuthenticationToken(principal));

        Object resolvedId = resolver.resolveArgument(
                getMethodParameter(0),
                mock(ModelAndViewContainer.class),
                mock(NativeWebRequest.class),
                mock(WebDataBinderFactory.class)
        );
        assertEquals(expectedId, resolvedId);

        Object resolvedStr = resolver.resolveArgument(
                getMethodParameter(1),
                mock(ModelAndViewContainer.class),
                mock(NativeWebRequest.class),
                mock(WebDataBinderFactory.class)
        );
        assertEquals(expectedId.toString(), resolvedStr);

        Object resolvedPrincipal = resolver.resolveArgument(
                getMethodParameter(2),
                mock(ModelAndViewContainer.class),
                mock(NativeWebRequest.class),
                mock(WebDataBinderFactory.class)
        );
        assertEquals(principal, resolvedPrincipal);
    }

    @Test
    @DisplayName("Throws AccessDeniedException when internal service token attempts to access learner parameter")
    void testRejectsInternalServiceToken() throws Exception {
        InternalServicePrincipal internalPrincipal = new InternalServicePrincipal("ml-recommendation");
        SecurityContextHolder.getContext().setAuthentication(new CadenceInternalAuthenticationToken(internalPrincipal));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                resolver.resolveArgument(
                        getMethodParameter(0),
                        mock(ModelAndViewContainer.class),
                        mock(NativeWebRequest.class),
                        mock(WebDataBinderFactory.class)
                )
        );

        assertTrue(ex.getMessage().contains("Endpoint requires a valid learner identity"));
    }

    @Test
    @DisplayName("Throws AccessDeniedException when unauthenticated")
    void testRejectsUnauthenticated() throws Exception {
        SecurityContextHolder.clearContext();

        assertThrows(AccessDeniedException.class, () ->
                resolver.resolveArgument(
                        getMethodParameter(0),
                        mock(ModelAndViewContainer.class),
                        mock(NativeWebRequest.class),
                        mock(WebDataBinderFactory.class)
                )
        );
    }
}
