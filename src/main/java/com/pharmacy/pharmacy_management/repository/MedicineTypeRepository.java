package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.MedicineType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MedicineTypeRepository extends JpaRepository<MedicineType, Long> {

    Optional<MedicineType> findByIgnoreCaseName(String name);

    boolean existsByNameIgnoreCase(String name);

    @Query("SELECT COUNT(m) FROM Medicine m WHERE m.medType.name= :typeName")
    Long countByMedType(@Param("typeName") String name);
}
