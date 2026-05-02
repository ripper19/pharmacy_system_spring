package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService{

    private final StaffRepository staffRepository;


    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Staff staff = staffRepository.findByEmail(username)
                .orElseThrow(()-> new RuntimeException("Not Found"));

        return org.springframework.security.core.userdetails.User
                .builder()
                .username(staff.getEmail())
                .password(staff.getPassword())
                .roles(staff.getRole().name())
                .build();
    }
}
