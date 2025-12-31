package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class SaleItemDto {
    @NotNull
    private String medicineName;

    @NotNull
    private int quantity;

    @NotNull
    private BigDecimal price;

    public String getMedicineName() {
        return medicineName;
    }

    public void setMedicineName(String medicineName) {
        this.medicineName = medicineName;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}
