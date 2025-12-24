package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotNull;

public class MedicineCheckStockDto {
    @NotNull
    private String medicineType;

    public String getMedicineType() {
        return medicineType;
    }

    public void setMedicineType(String medicineType) {
        this.medicineType = medicineType;
    }
}
