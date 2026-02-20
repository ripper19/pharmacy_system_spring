package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.LoginDetailsDto;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.StaffRepository;
import com.pharmacy.pharmacy_management.service.LoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {
    @Autowired
    private LoginService loginService;
    @Autowired
    private StaffRepository staffRepository;

    @GetMapping("/login")
    public ResponseEntity<LoginService.AuthenticatedUserDetails> loggingIn(@RequestBody LoginDetailsDto detailsDto){
        return ResponseEntity.status(HttpStatus.OK).body(loginService.logInResponse(detailsDto));
    }
}
