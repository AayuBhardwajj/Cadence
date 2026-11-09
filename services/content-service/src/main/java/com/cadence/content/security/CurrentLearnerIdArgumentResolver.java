package com.cadence.content.security;

import com.cadence.security.auth.CadenceLearnerAuthenticationToken;
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
 * Resolves @CurrentLearnerId parameters from the shared CadenceLearnerAuthenticationToken.
 * Supports required=false for public read endpoints that optionally accept a learner context.
 * <p>
 * Uses the SHARED com.cadence.security.auth.CadenceLearnerAuthenticationToken so the
 * identity always comes from a cryptographically verified JWT (D27).
 */
public class CurrentLearnerIdArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentLearnerId.class)
                && UUID.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory
    ) {
        CurrentLearnerId annotation = parameter.getParameterAnnotation(CurrentLearnerId.class);
        boolean required = annotation == null || annotation.required();

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Extract UUID from the SHARED token's LearnerPrincipal (cryptographically verified)
        if (authentication instanceof CadenceLearnerAuthenticationToken sharedToken) {
            LearnerPrincipal principal = sharedToken.getPrincipal();
            return principal.userId();
        }

        if (required) {
            throw new AccessDeniedException("Authenticated learner is required for this operation");
        }

        return null;
    }
}

