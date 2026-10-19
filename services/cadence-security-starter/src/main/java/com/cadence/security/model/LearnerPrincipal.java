package com.cadence.security.model;

import java.io.Serializable;
import java.security.Principal;
import java.util.Objects;
import java.util.UUID;

/**
 * Principal representing an authenticated learner.
 */
public record LearnerPrincipal(
        UUID userId,
        String email,
        String role
) implements Principal, Serializable {

    public LearnerPrincipal {
        Objects.requireNonNull(userId, "userId must not be null");
    }

    @Override
    public String getName() {
        return userId.toString();
    }
}
