package com.cadence.security.auth;

import com.cadence.security.model.InternalServicePrincipal;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;

/**
 * Authentication token for verified internal service-to-service requests.
 * Explicitly grants ROLE_INTERNAL_SERVICE.
 * Does NOT grant ROLE_LEARNER.
 */
public class CadenceInternalAuthenticationToken extends AbstractAuthenticationToken {

    public static final String ROLE_INTERNAL_SERVICE = "ROLE_INTERNAL_SERVICE";

    private static final List<GrantedAuthority> DEFAULT_AUTHORITIES = List.of(
            new SimpleGrantedAuthority(ROLE_INTERNAL_SERVICE)
    );

    private final InternalServicePrincipal principal;

    public CadenceInternalAuthenticationToken(InternalServicePrincipal principal) {
        super(DEFAULT_AUTHORITIES);
        this.principal = principal;
        setAuthenticated(true);
    }

    public CadenceInternalAuthenticationToken(InternalServicePrincipal principal, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null; // Secrets are not retained in the token
    }

    @Override
    public InternalServicePrincipal getPrincipal() {
        return principal;
    }
}
