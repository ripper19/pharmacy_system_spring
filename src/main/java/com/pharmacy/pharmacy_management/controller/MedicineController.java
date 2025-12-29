package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.MedicineAddDto;
import com.pharmacy.pharmacy_management.model.Medicine;
import com.pharmacy.pharmacy_management.service.MedicineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/medicine")
public class MedicineController {

    @Autowired
    private MedicineService medService;

    @PostMapping("/create")
    public ResponseEntity<String> createMedicine(@RequestBody  MedicineAddDto addDto){
        String created = medService.addMedStock(addDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/update")
    public ResponseEntity<Medicine> updateMedicine(@RequestBody MedicineAddDto updDto){
        Medicine updated = medService.updateMedStock(updDto);
        return ResponseEntity.status(HttpStatus.OK).body(updated);
    }
}
