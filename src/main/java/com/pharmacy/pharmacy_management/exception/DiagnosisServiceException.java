package com.pharmacy.pharmacy_management.exception;

/**
 * Raised when the differential-diagnosis LLM call fails or is not configured.
 * Mapped to HTTP 503 by {@link GlobalExceptionHandler}.
 */
public class DiagnosisServiceException extends RuntimeException {

    public DiagnosisServiceException(String message) {
        super(message);
    }

    public DiagnosisServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
