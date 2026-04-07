package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.LoginDetailsDto;
import com.pharmacy.pharmacy_management.exception.WrongUser;
import com.pharmacy.pharmacy_management.model.Role;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.StaffRepository;
import com.pharmacy.pharmacy_management.service.LoginService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    @Autowired
    private LoginService loginService;
    @Autowired
    private StaffRepository staffRepository;

    @PostMapping("/login")
    public ResponseEntity<LoginService.AuthenticatedUserDetails> loggingIn(@RequestBody LoginDetailsDto detailsDto, HttpServletRequest request){
        return ResponseEntity.status(HttpStatus.OK).body(loginService.logInResponse(detailsDto, request));
    }
    @GetMapping("/me")
    public ResponseEntity<AuthenticatedUserDetails> authenticateMe(Authentication authentication){
        if (authentication==null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String name = authentication.getName();
        Staff staff = staffRepository.findByEmail(name)
                .orElseThrow((()->new WrongUser("User not found")));
        return ResponseEntity.status(HttpStatus.OK).body(new AuthenticatedUserDetails(staff.getName(), staff.getEmail(), staff.getRole()));
    }
    public record AuthenticatedUserDetails(String name, String email, Role role){}
}
