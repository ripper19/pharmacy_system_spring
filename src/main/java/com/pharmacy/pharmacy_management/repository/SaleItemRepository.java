package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.Medicine;
import com.pharmacy.pharmacy_management.model.Sale;
import com.pharmacy.pharmacy_management.model.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    List<SaleItem> findBySale(Sale sale);

    List<SaleItem> findByMedicine(Medicine medicine);
}
