
package com.cadence.security.auth;

import com.cadence.security.model.LearnerPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class CadenceLearnerAuthenticationTokenTest {

    private LearnerPrincipal createPrincipal(String role) {
        return new LearnerPrincipal(
                UUID.randomUUID(),
                "test@example.com",
                role);
    }

    private Set<String> getAuthorities(
            CadenceLearnerAuthenticationToken token) {
        return token.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .collect(Collectors.toSet());
    }

    @Test
    @DisplayName("Authenticated role receives learner authorities")
    void authenticatedRoleReceivesLearnerAuthorities() {
        var token = new CadenceLearnerAuthenticationToken(
                createPrincipal("authenticated"));

        assertTrue(token.isAuthenticated());

        assertEquals(
                Set.of("ROLE_LEARNER", "ROLE_AUTHENTICATED"),
                getAuthorities(token));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "anon",
            "service_role",
            "admin",
            "unknown"
    })
    @DisplayName("Non-authenticated roles receive no authorities")
    void nonAuthenticatedRolesReceiveNoAuthorities(String role) {
        var token = new CadenceLearnerAuthenticationToken(
                createPrincipal(role));

        assertTrue(token.isAuthenticated());
        assertTrue(
                token.getAuthorities().isEmpty(),
                "Unexpected authorities for role: " + role);
    }

    @Test
    @DisplayName("Null role receives no authorities")
    void nullRoleReceivesNoAuthorities() {
        var token = new CadenceLearnerAuthenticationToken(
                createPrincipal(null));

        assertTrue(token.isAuthenticated());
        assertTrue(token.getAuthorities().isEmpty());
    }
}
