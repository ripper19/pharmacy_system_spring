package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.MedicineTypeCreateDto;
import com.pharmacy.pharmacy_management.dto.MedicineTypeDeleteDto;
import com.pharmacy.pharmacy_management.dto.MedicineTypeUpdateDto;
import com.pharmacy.pharmacy_management.model.MedicineType;
import com.pharmacy.pharmacy_management.service.MedicineTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/Medicine_Type")
public class MedTypeController {

    @Autowired
    private final MedicineTypeService medicineTypeService;

    public MedTypeController(MedicineTypeService medicineTypeService) {
        this.medicineTypeService = medicineTypeService;
    }

    @PostMapping("/addType")
    public ResponseEntity<String> addMedicineType(@RequestBody MedicineTypeCreateDto addDto){
        String created = medicineTypeService.addMedType(addDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    @DeleteMapping("delete_Type")
    public ResponseEntity<String> delMedicineType(@PathVariable MedicineTypeDeleteDto delDto){
        String deleted = medicineTypeService.delMedType(delDto);
        return ResponseEntity.status(HttpStatus.OK).body(deleted);
    }
    @PutMapping("/updateType")
    public ResponseEntity<String> updateMedicineType(@RequestBody MedicineTypeUpdateDto dto){
        String updated = medicineTypeService.updateMedType(dto);
        return ResponseEntity.status(HttpStatus.OK).body(updated);
    }

}
