package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, String> {

    Optional<Medicine> findByMedicineName(String medicineName);

    Optional<Medicine> findBySku(String sku);

}
