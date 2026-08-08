package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.Medicine;
import com.pharmacy.pharmacy_management.model.MedicineType;
import com.pharmacy.pharmacy_management.service.MedicineService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, String> {

    Optional<Medicine> findByMedicineName(String medicineName);

    Optional<Medicine> findBySku(String sku);

    Optional<Medicine> findByPublicId(UUID publicId);

    @Query("""
            SELECT m FROM Medicine m
            WHERE (:type IS NULL OR lower(m.medType.name) = :type)
              AND (:q IS NULL
                   OR lower(m.medicineName) LIKE :q
                   OR lower(m.sku) LIKE :q
                   OR lower(m.medType.name) LIKE :q)
           """)
    Page<Medicine> search(@Param("type") String type, @Param("q") String q, Pageable pageable);

    @Query("""
            SELECT new com.pharmacy.pharmacy_management.service.MedicineService$MedicineView(
                       m.publicId,
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
