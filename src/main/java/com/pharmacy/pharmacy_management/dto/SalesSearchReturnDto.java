package com.pharmacy.pharmacy_management.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SalesSearchReturnDto {
    private Long id;

    private BigDecimal total;

    private LocalDateTime saleTime;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public LocalDateTime getSaleTime() {
        return saleTime;
    }

    public void setSaleTime(LocalDateTime saleTime) {
        this.saleTime = saleTime;
    }
}
