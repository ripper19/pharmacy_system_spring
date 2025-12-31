package com.pharmacy.pharmacy_management.dto;

import com.pharmacy.pharmacy_management.model.SaleItem;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class saleCreationDto {
    @NotNull
    private String clientName;

    @NotNull
    private String clientPhone;

    @NotNull
    private String prescriptionInfo;

    @NotNull
    private String saleType;

    @NotNull
    private List<SaleItemDto> items;

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getClientPhone() {
        return clientPhone;
    }

    public void setClientPhone(String clientPhone) {
        this.clientPhone = clientPhone;
    }

    public String getPrescriptionInfo() {
        return prescriptionInfo;
    }

    public void setPrescriptionInfo(String prescriptionInfo) {
        this.prescriptionInfo = prescriptionInfo;
    }

    public String getSaleType() {
        return saleType;
    }

    public void setSaleType(String saleType) {
        this.saleType = saleType;
    }

    public List<SaleItemDto> getItems() {
        return items;
    }

    public void setItems(List<SaleItemDto> items) {
        this.items = items;
    }
}
