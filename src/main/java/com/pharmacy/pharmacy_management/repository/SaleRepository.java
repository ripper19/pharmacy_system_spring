package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findByClientPhone(String clientPhone);

    @Query("""
            SELECT COALESCE(SUM(s.total), 0)
            FROM Sale s
            WHERE s.saleTime >= :start
            AND s.saleTime < :end
           """)
    BigDecimal sumAllSalesBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    List<Sale> findTop10BySaleTimeBetweenOrderBySaleTimeDesc(LocalDateTime start, LocalDateTime end);
}
