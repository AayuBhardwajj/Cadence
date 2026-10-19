package com.cadence.security.exception;

/**
 * Thrown when token verification fails.
 * Error messages must remain sanitized and free of token, secret, or payload material.
 */
public class InvalidTokenException extends RuntimeException {

    public enum Reason {
        MALFORMED,
        EXPIRED,
        BAD_SIGNATURE,
        INVALID_ISSUER,
        INVALID_AUDIENCE,
        UNSUPPORTED_ALGORITHM,
        MISSING_SUBJECT,
        INVALID_SUBJECT,
        KEY_RESOLUTION_FAILED
    }

    private final Reason reason;

    public InvalidTokenException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public InvalidTokenException(Reason reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
