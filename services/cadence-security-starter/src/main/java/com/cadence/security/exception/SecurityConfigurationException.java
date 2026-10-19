package com.cadence.security.exception;

/**
 * Thrown when security configuration properties are invalid, missing, or contradictory.
 * Halts startup to ensure the service fails closed.
 */
public class SecurityConfigurationException extends RuntimeException {
    public SecurityConfigurationException(String message) {
        super(message);
    }

    public SecurityConfigurationException(String message, Throwable cause) {
        super(message, cause);
    }
}
