package com.pharmacy.pharmacy_management.dto;

import java.math.BigDecimal;

public class SaleItemReturnDto {
    private BigDecimal price;

    private int quantity;

    private String medSku;

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getMedSku() {
        return medSku;
    }

    public void setMedSku(String medSku) {
        this.medSku = medSku;
    }
}
