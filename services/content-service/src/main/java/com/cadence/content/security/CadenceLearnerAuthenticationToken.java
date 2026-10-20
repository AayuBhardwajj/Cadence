package com.cadence.content.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

public class CadenceLearnerAuthenticationToken extends AbstractAuthenticationToken {

    private final LearnerPrincipal principal;

    public CadenceLearnerAuthenticationToken(LearnerPrincipal principal) {
        super(List.of(new SimpleGrantedAuthority("ROLE_LEARNER")));
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return "";
    }

    @Override
    public LearnerPrincipal getPrincipal() {
        return principal;
    }
}
