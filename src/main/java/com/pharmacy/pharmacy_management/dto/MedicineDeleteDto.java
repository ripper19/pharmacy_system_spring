package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotNull;

public class MedicineDeleteDto {
    @NotNull
    private String name;

    @NotNull
    private String sku;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }
}
