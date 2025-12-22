package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findByClientPhone(String clientPhone);
}
