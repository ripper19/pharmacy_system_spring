package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotNull;

public class StaffDeleteDto {
    @NotNull
    private Long Id;
    @NotNull
    private String email;

    public Long getId() {
        return Id;
    }

    public void setId(Long id) {
        Id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
