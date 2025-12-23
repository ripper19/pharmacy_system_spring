package com.pharmacy.pharmacy_management.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Medicine {
    @Id
    @Column(unique = true)
    private String sku;

    private String medicineName;

    @ManyToOne
    private MedicineType med_type;

    private int quantity;

    private BigDecimal cost;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MedicineStatus status;

    private Integer lowStockThreshold;

    @Version
    private Long version;

    //Status calculation and assignment
    @PrePersist
    @PreUpdate
    private void calculateStatus(){
        this.status = determineMedicineStatusWithQuantity(this.quantity);
    }

    private MedicineStatus determineMedicineStatusWithQuantity(int qty){
        if (qty == 0 || qty < 0) return MedicineStatus.UNAVAILABLE;
        return MedicineStatus.AVAILABLE;
    }
    public MedicineStatus getStatus(){
        return status;
    }
    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getMedicineName() {
        return medicineName;
    }

    public void setMedicineName(String medicineName) {
        this.medicineName = medicineName;
    }

    public MedicineType getMed_type() {
        return med_type;
    }

    public void setMed_type(MedicineType med_type) {
        this.med_type = med_type;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getCost() {
        return cost;
    }

    public void setCost(BigDecimal cost) {
        this.cost = cost;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getLowStockThreshold() {
        return lowStockThreshold;
    }

    public void setLowStockThreshold(Integer lowStockThreshold) {
        this.lowStockThreshold = lowStockThreshold;
    }

}
