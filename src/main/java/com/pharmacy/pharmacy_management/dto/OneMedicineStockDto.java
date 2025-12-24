package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotNull;

public class OneMedicineStockDto {
    @NotNull
    private String medicineName;

    public String getMedicineName() {
        return medicineName;
    }

    public void setMedicineName(String medicineName) {
        this.medicineName = medicineName;
    }
}
