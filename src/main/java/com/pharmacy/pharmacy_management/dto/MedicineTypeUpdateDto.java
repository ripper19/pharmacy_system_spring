package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotNull;

public class MedicineTypeUpdateDto {
    @NotNull
    private String currentName;
    @NotNull
    private String updateName;

    private String description;

    public String getCurrentName() {
        return currentName;
    }

    public void setCurrentName(String currentName) {
        this.currentName = currentName;
    }

    public String getUpdateName() {
        return updateName;
    }

    public void setUpdateName(String updateName) {
        this.updateName = updateName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
