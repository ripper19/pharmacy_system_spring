package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.MedicineTypeCreateDto;
import com.pharmacy.pharmacy_management.dto.MedicineTypeDeleteDto;
import com.pharmacy.pharmacy_management.dto.MedicineTypeUpdateDto;
import com.pharmacy.pharmacy_management.service.MedicineTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/Medicine_Type")
public class MedTypeController {

    @Autowired
    private MedicineTypeService medicineTypeService;

    @PostMapping("/addType")
    public ResponseEntity<String> addMedicineType(@RequestBody MedicineTypeCreateDto addDto){
        String created = medicineTypeService.addMedType(addDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("delete_Type/{name}")
    public ResponseEntity<String> delMedicineType(@PathVariable String name){
        String deleted = medicineTypeService.delMedType(name);
        return ResponseEntity.ok().body(deleted);
    }
    @GetMapping("/getAll")
    public ResponseEntity<List<MedicineTypeService.Typenames>> getAllMedicineTypes(){
        return ResponseEntity.ok().body(medicineTypeService.getAllMedTypes());
    }

    @GetMapping("/check/{type}")
    public ResponseEntity<Long> checkNumberType(@PathVariable String type){
        Long count = medicineTypeService.getNumberMedicineInType(type);
        return ResponseEntity.ok().body(count);
    }
}
