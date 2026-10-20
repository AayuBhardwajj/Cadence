package com.cadence.content.security;

import java.security.Principal;
import java.util.UUID;

public record LearnerPrincipal(UUID userId, String email, String role) implements Principal {
    @Override
    public String getName() {
        return userId != null ? userId.toString() : "";
    }
}
