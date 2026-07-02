package com.cadence.auth.exception;

/**
 * Thrown when a user ID extracted from a valid JWT has no corresponding
 * row in the application's users table.
 */
public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String message) {
        super(message);
    }

    public UserNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
