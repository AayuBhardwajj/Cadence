package com.cadence.security.model;

import java.io.Serializable;
import java.security.Principal;

/**
 * Principal representing an authenticated internal backend/ML service.
 */
public record InternalServicePrincipal(
        String serviceName
) implements Principal, Serializable {

    public InternalServicePrincipal {
        if (serviceName == null || serviceName.isBlank()) {
            serviceName = "internal-service";
        }
    }

    @Override
    public String getName() {
        return serviceName;
    }
}
