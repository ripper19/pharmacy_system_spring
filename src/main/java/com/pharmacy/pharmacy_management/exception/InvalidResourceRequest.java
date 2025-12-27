package com.pharmacy.pharmacy_management.exception;

public class InvalidResourceRequest extends RuntimeException {
    public InvalidResourceRequest(String message) {
        super(message);
    }
}
