package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.StaffCreateDto;
import com.pharmacy.pharmacy_management.dto.StaffDeleteDto;
import com.pharmacy.pharmacy_management.dto.StaffSuperDto;
import com.pharmacy.pharmacy_management.dto.StaffUpdateDto;
import com.pharmacy.pharmacy_management.exception.RolePermission;
import com.pharmacy.pharmacy_management.model.Role;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.service.StaffService;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;

import java.util.List;

@RestController
@RequestMapping("/staff")
public class StaffController {

    @Autowired
    private final StaffService staffService;
    @Autowired
    private UserDetailsService userDetailsService;

    private final Logger logger = LoggerFactory.getLogger(StaffController.class);

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createStaff(@RequestBody StaffCreateDto dto) {
        try{
        staffService.addUser(dto);
        logger.info("User {} added by {}", dto.getName(), staffService.currentUSer().getName());
        return ResponseEntity.status(HttpStatus.CREATED).build();

        } catch (RolePermission e) {
            logger.warn("Invalid action by {} has insufficient permission", staffService.currentUSer());
            throw new RolePermission("You dont have enough permission to perform this action");
        }
    }

    @PostMapping("/update")
    public ResponseEntity<Staff> updateStaff(@RequestBody StaffUpdateDto updDto) {
        Staff logged = staffService.currentUSer();
        updDto.setEmail(logged.getEmail());
        Staff update = staffService.updateUser(updDto);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(update);
    }

    @PatchMapping("/supdate/{email}")
    public ResponseEntity<availableStaff> updateStaff(@PathVariable String email, @RequestBody StaffSuperDto dto){
        logger.info("Email{} details {} ,{} ,{} ,{}.", email, dto.getName(), dto.getUpdEmail(),dto.getRole(),dto.getPhoneNo());
        Staff staff = staffService.updateSuper(email,dto);
        return ResponseEntity.ok().body(new availableStaff(staff.getId(), staff.getName(),staff.getPhoneNo(),staff.getEmail(),staff.getRole()));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<String> deleteStaff(@RequestBody StaffDeleteDto delDto) {
        staffService.deleteStaff(delDto);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/email")
    public ResponseEntity<availableStaff> validatExistingUser(@RequestParam String email) {
        Staff staff = staffService.findUser(email);
        logger.info("Data requested for {}", staff.getName());
        return ResponseEntity.ok().body(new availableStaff(staff.getId(),staff.getName(),staff.getPhoneNo(),staff.getEmail(),staff.getRole()));
    }
    public record availableStaff(Long Id, String name, String phoneNo, String email, Role role){}

    @GetMapping("/all")
    public ResponseEntity<List<StaffService.AllDto>> returnAllStaff(){
        return ResponseEntity.ok().body(staffService.getAll());
    }
}