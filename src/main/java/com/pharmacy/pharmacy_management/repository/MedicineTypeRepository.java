package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.MedicineType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MedicineTypeRepository extends JpaRepository<MedicineType, Long> {

    Optional<MedicineType> findByIgnoreCaseName(String name);

    boolean existsByNameIgnoreCase(String name);
}
