package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.Medicine;
import com.pharmacy.pharmacy_management.model.MedicineType;
import com.pharmacy.pharmacy_management.service.MedicineService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, String> {

    Optional<Medicine> findByMedicineName(String medicineName);

    Optional<Medicine> findBySku(String sku);

    @Query("""
            SELECT new com.pharmacy.pharmacy_management.service.MedicineService$MedicineView(
                       m.medicineName,
                       m.quantity,
                       m.status,
                       m.cost
                       )
            FROM Medicine m
            WHERE m.medType= :type
           """)
    List<MedicineService.MedicineView> findByMedType(@Param("type") MedicineType medType);

}
