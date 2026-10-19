package com.cadence.security.isolation;

import com.cadence.security.auth.CadenceInternalAuthenticationToken;
import com.cadence.security.auth.CadenceLearnerAuthenticationToken;
import com.cadence.security.model.InternalServicePrincipal;
import com.cadence.security.model.LearnerPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = LearnerVsInternalSecurityTest.TestConfig.class)
class LearnerVsInternalSecurityTest {

    @Configuration
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        public SecuredResourceService securedResourceService() {
            return new SecuredResourceService();
        }
    }

    @Service
    public static class SecuredResourceService {

        @PreAuthorize("hasRole('LEARNER')")
        public String executeLearnerAction(UUID learnerId) {
            return "learner-action-executed-for-" + learnerId;
        }

        @PreAuthorize("hasRole('INTERNAL_SERVICE')")
        public String executeInternalMlAction() {
            return "internal-ml-pipeline-executed";
        }
    }

    @Autowired
    private SecuredResourceService securedService;

    private UUID testLearnerId;

    @BeforeEach
    void setUp() {
        testLearnerId = UUID.randomUUID();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Learner token CAN access learner-secured route")
    void testLearnerAccessesLearnerRoute() {
        LearnerPrincipal learner = new LearnerPrincipal(testLearnerId, "learner@cadence.ai", "authenticated");
        SecurityContextHolder.getContext().setAuthentication(new CadenceLearnerAuthenticationToken(learner));

        String result = securedService.executeLearnerAction(testLearnerId);
        assertEquals("learner-action-executed-for-" + testLearnerId, result);
    }

    @Test
    @DisplayName("Learner token CANNOT access internal ML / report-writing route (Fails with AccessDeniedException)")
    void testLearnerCannotAccessInternalRoute() {
        LearnerPrincipal learner = new LearnerPrincipal(testLearnerId, "learner@cadence.ai", "authenticated");
        SecurityContextHolder.getContext().setAuthentication(new CadenceLearnerAuthenticationToken(learner));

        assertThrows(AccessDeniedException.class, () -> securedService.executeInternalMlAction());
    }

    @Test
    @DisplayName("Internal service token CAN access internal ML / report route")
    void testInternalServiceAccessesInternalRoute() {
        InternalServicePrincipal internalPrincipal = new InternalServicePrincipal("ml-analysis");
        SecurityContextHolder.getContext().setAuthentication(new CadenceInternalAuthenticationToken(internalPrincipal));

        String result = securedService.executeInternalMlAction();
        assertEquals("internal-ml-pipeline-executed", result);
    }

    @Test
    @DisplayName("Internal service token CANNOT access learner route (Fails with AccessDeniedException)")
    void testInternalServiceCannotAccessLearnerRoute() {
        InternalServicePrincipal internalPrincipal = new InternalServicePrincipal("ml-analysis");
        SecurityContextHolder.getContext().setAuthentication(new CadenceInternalAuthenticationToken(internalPrincipal));

        assertThrows(AccessDeniedException.class, () -> securedService.executeLearnerAction(testLearnerId));
    }
}
