package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.StaffCreateDto;
import com.pharmacy.pharmacy_management.dto.StaffUpdateDto;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.service.StaffService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/staff")
public class StaffController {

    @Autowired
    private final StaffService staffService;
    @Autowired
    private UserDetailsService userDetailsService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @PostMapping("/create")
    public ResponseEntity<Staff> createStaff(@RequestBody StaffCreateDto dto) {
        Staff created = staffService.addUser(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/update")
    public ResponseEntity<Staff> updateStaff(@RequestBody StaffUpdateDto updDto) {
        Staff logged = staffService.currentUSer();
        updDto.setEmail(logged.getEmail());
        Staff update = staffService.updateUser(updDto);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(update);
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Staff> deleteStaff(@RequestBody StaffUpdateDto delDto) {
        Staff logged = staffService.currentUSer();
        System.out.println(logged.getName() + "trying to delete" + delDto.getPhoneNo());
        Staff delete = staffService.deleteStaff(delDto);

        return ResponseEntity.status(HttpStatus.OK).body(delete);
    }
}