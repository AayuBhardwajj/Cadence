
package com.cadence.security.auth;

import com.cadence.security.model.LearnerPrincipal;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;

/**
 * Authentication token for verified learner requests.
 * Grants ROLE_LEARNER and ROLE_AUTHENTICATED only
 * when the verified JWT role is "authenticated".
 * Does NOT grant ROLE_INTERNAL_SERVICE.
 */
public class CadenceLearnerAuthenticationToken extends AbstractAuthenticationToken {

    public static final String ROLE_LEARNER = "ROLE_LEARNER";
    public static final String ROLE_AUTHENTICATED = "ROLE_AUTHENTICATED";

    private final LearnerPrincipal principal;

    public CadenceLearnerAuthenticationToken(LearnerPrincipal principal) {
        super(deriveAuthorities(principal != null ? principal.role() : null));
        this.principal = principal;
        setAuthenticated(true);
    }

    private static List<GrantedAuthority> deriveAuthorities(String role) {
        if ("authenticated".equals(role)) {
            return List.of(
                    new SimpleGrantedAuthority(ROLE_LEARNER),
                    new SimpleGrantedAuthority(ROLE_AUTHENTICATED)
            );
        }

        return List.of();
    }

    public CadenceLearnerAuthenticationToken(
            LearnerPrincipal principal,
            Collection<? extends GrantedAuthority> authorities
    ) {
        super(authorities);
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public LearnerPrincipal getPrincipal() {
        return principal;
    }
}
