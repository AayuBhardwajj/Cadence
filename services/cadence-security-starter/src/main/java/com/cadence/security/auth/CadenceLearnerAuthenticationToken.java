package com.cadence.security.auth;

import com.cadence.security.model.LearnerPrincipal;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;

/**
 * Authentication token for verified learner requests.
 * Explicitly grants ROLE_LEARNER and ROLE_AUTHENTICATED.
 * Does NOT grant ROLE_INTERNAL_SERVICE.
 */
public class CadenceLearnerAuthenticationToken extends AbstractAuthenticationToken {

    public static final String ROLE_LEARNER = "ROLE_LEARNER";
    public static final String ROLE_AUTHENTICATED = "ROLE_AUTHENTICATED";

    private static final List<GrantedAuthority> DEFAULT_AUTHORITIES = List.of(
            new SimpleGrantedAuthority(ROLE_LEARNER),
            new SimpleGrantedAuthority(ROLE_AUTHENTICATED)
    );

    private final LearnerPrincipal principal;

    public CadenceLearnerAuthenticationToken(LearnerPrincipal principal) {
        super(DEFAULT_AUTHORITIES);
        this.principal = principal;
        setAuthenticated(true);
    }

    public CadenceLearnerAuthenticationToken(LearnerPrincipal principal, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null; // Credentials (JWT) are not retained in memory
    }

    @Override
    public LearnerPrincipal getPrincipal() {
        return principal;
    }
}
