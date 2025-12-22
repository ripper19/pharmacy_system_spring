package com.pharmacy.pharmacy_management.repository;

import com.pharmacy.pharmacy_management.model.Role;
import com.pharmacy.pharmacy_management.model.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StaffRepository extends JpaRepository<Staff,Long> {

    Optional<Staff> findByPhoneNo(String phoneNo);
    Optional<Staff> findById(Long Id);

    long countByRole(Role role);

    Optional<Staff> findByEmail(String email);
}
