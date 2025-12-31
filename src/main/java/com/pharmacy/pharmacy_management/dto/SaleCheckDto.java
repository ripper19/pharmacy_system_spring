package com.pharmacy.pharmacy_management.dto;

import jakarta.validation.constraints.NotNull;

public class SaleCheckDto {
    @NotNull
    private String clientPhone;

    public String getClientPhone() {
        return clientPhone;
    }

    public void setClientPhone(String clientPhone) {
        this.clientPhone = clientPhone;
    }
}
