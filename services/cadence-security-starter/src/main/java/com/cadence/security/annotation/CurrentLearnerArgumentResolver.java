package com.cadence.security.annotation;

import com.cadence.security.model.LearnerPrincipal;
import org.springframework.core.MethodParameter;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.UUID;

/**
 * Resolves @CurrentLearnerId and @CurrentLearner controller method arguments.
 * Enforces learner identity extraction and rejects unauthenticated or internal service principals.
 */
public class CurrentLearnerArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        boolean hasLearnerId = parameter.hasParameterAnnotation(CurrentLearnerId.class)
                && (parameter.getParameterType().equals(UUID.class) || parameter.getParameterType().equals(String.class));

        boolean hasLearner = parameter.hasParameterAnnotation(CurrentLearner.class)
                && parameter.getParameterType().equals(LearnerPrincipal.class);

        return hasLearnerId || hasLearner;
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory
    ) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Endpoint requires learner authentication");
        }

        Object principal = auth.getPrincipal();
        if (!(principal instanceof LearnerPrincipal learnerPrincipal)) {
            throw new AccessDeniedException(
                    "Endpoint requires a valid learner identity; received: " +
                            (principal != null ? principal.getClass().getSimpleName() : "null")
            );
        }

        if (parameter.hasParameterAnnotation(CurrentLearnerId.class)) {
            if (parameter.getParameterType().equals(UUID.class)) {
                return learnerPrincipal.userId();
            } else {
                return learnerPrincipal.userId().toString();
            }
        }

        return learnerPrincipal;
    }
}
