package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.LoginDetailsDto;
import com.pharmacy.pharmacy_management.dto.LoginResponse;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.service.LoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private LoginService loginService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;


    @PostMapping("/login")
    public ResponseEntity<LoginResponse> authenticate(@RequestBody LoginDetailsDto input){
        Staff authenticated = loginService.logInResponse(input);
        UserDetails userDetails = userDetailsService.loadUserByUsername(input.getEmail());
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", userDetails.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .toList());

        String token = jwtService.generateToken(claims,userDetails);

        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(token);
        loginResponse.setExpiresIn(jwtService.getJwtExpiration());
        return ResponseEntity.ok(loginResponse);
    }
}
