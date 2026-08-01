package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class StaffDeleteDto {
    @NotNull
    private UUID publicId;
    @NotNull
    private String email;

    public UUID getPublicId() {
        return publicId;
    }

    public void setPublicId(UUID publicId) {
        this.publicId = publicId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
