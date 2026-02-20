package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.LoginDetailsDto;
import com.pharmacy.pharmacy_management.dto.LoginResponse;
import com.pharmacy.pharmacy_management.exception.WrongUser;
import com.pharmacy.pharmacy_management.model.Role;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.StaffRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoginService {

    @Autowired
    private StaffRepository staffRepository;
    @Autowired
    private final AuthenticationManager authManager;

    private final Logger logger = LoggerFactory.getLogger(LoginService.class);
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();


    public LoginService(StaffRepository staffRepository, AuthenticationManager authManager, BCryptPasswordEncoder passwordEncoder){
        this.authManager = authManager;
        this.staffRepository = staffRepository;
    }
    @Transactional
    public AuthenticatedUserDetails logInResponse(LoginDetailsDto detailsDto){
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        detailsDto.getEmail(),
                        detailsDto.getPassword()
                )
        );
        Staff staff = staffRepository.findByEmail(detailsDto.getEmail())
                .orElseThrow(()-> new WrongUser("User isn't registered with the system"));
        return new AuthenticatedUserDetails(staff.getName(),staff.getEmail(),staff.getRole());
    }
    public record AuthenticatedUserDetails(String name,
                                            String email,
                                            Role role){}
}
