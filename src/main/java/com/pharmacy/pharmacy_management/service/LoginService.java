package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.LoginDetailsDto;
import com.pharmacy.pharmacy_management.exception.WrongUser;
import com.pharmacy.pharmacy_management.model.Role;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.StaffRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginService {

    private final StaffRepository staffRepository;

    private final AuthenticationManager authenticationManager;

    private final Logger logger = LoggerFactory.getLogger(LoginService.class);

    public AuthenticatedUserDetails logInResponse(LoginDetailsDto detailsDto, HttpServletRequest request){
        HttpSession existingSession = request.getSession(false);
        if (existingSession != null){existingSession.invalidate();}
        Authentication auth = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(detailsDto.getEmail(), detailsDto.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(auth);
        HttpSession session = request.getSession(true);
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext()
        );
        Staff staff = staffRepository.findByEmail(detailsDto.getEmail())
                .orElseThrow(()-> new WrongUser("User isn't registered with the system"));
        return new AuthenticatedUserDetails(staff.getName(),staff.getEmail(),staff.getRole());
    }
    public record AuthenticatedUserDetails(String name,
                                            String email,
                                            Role role){}
}
