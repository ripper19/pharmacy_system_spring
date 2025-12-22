package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotBlank;

public class MedicineTypeCreateDto {

    @NotBlank
    private String name;

    @NotBlank
    private String Description;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return Description;
    }

    public void setDescription(String description) {
        Description = description;
    }
}
