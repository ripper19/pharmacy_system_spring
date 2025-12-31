package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.*;
import com.pharmacy.pharmacy_management.exception.ResourceInUse;
import com.pharmacy.pharmacy_management.service.MedicineService;
import com.pharmacy.pharmacy_management.service.StaffService;
import jakarta.persistence.OptimisticLockException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/medicine")
public class MedicineController {

    @Autowired
    private MedicineService medService;
    @Autowired
    private StaffService staffService;
    private final Logger logger = LoggerFactory.getLogger(MedicineController.class);


    @PostMapping("/create")
    public ResponseEntity<String> createMedicine(@RequestBody  MedicineAddDto addDto){
        try{
            String created = medService.addMedStock(addDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        }catch (OptimisticLockException e){
            logger.error("Optimistic Lock caught: {} ",e.getMessage(),e);
            throw new ResourceInUse("Resource is in use at the moment");
        }catch (RuntimeException ex) {
            logger.error("Error occurred: {}", ex.getMessage(), ex);
            throw new RuntimeException("DB error occurred. Consult Logs" + ex.getMessage());
        }
    }

    @PostMapping("/update")
    public ResponseEntity<String> updateMedicine(@RequestBody MedicineUpdateDto updDto){
        try {
            String updated = medService.updateMedStock(updDto);
            return ResponseEntity.status(HttpStatus.OK).body(updated);
        }catch (OptimisticLockException ex){
            logger.error("Optimistic lock on medicine update: {}",ex.getMessage(),ex);
            throw new ResourceInUse("Resource in use try after 3 seconds");
        } catch (RuntimeException e) {
            logger.error("DB Error occurred during Medicine update {}",e.getMessage(),e);
            throw new RuntimeException("Db error occurred. Please Consult logs for more info.");
        }
    }


    @PostMapping("/checkTypeStock")
    public ResponseEntity<List> checkStockByMedType(@RequestBody MedicineCheckStockDto checkStockDto){
        try {
            List<MedicineService.MedicineStockView> medList = medService.checkMedicineStock(checkStockDto);
            return ResponseEntity.status(HttpStatus.OK).body(medList);
        } catch (RuntimeException e) {
            logger.error("Error when fetching Medicine by Medicine type: {} ",e.getMessage(),e);
            throw new RuntimeException("Failed to fetch data. Please Consult logs for more info");
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<String> deleteMedicine(@RequestBody MedicineDeleteDto deleteDto){
        try {
            String deleted = medService.delMedStock(deleteDto);
            return ResponseEntity.status(HttpStatus.OK).body(deleted);
        }catch (OptimisticLockException ex){
            logger.error("Optimistic lock on medicine delete: {}",ex.getMessage(),ex);
            throw new ResourceInUse("Resource is in use. Please wait for 3 seconds then try again");
        }catch (RuntimeException e){
            logger.error("Error when Deleting Medicine {}: {} ",deleteDto.getName(),e.getMessage(),e);
            throw new RuntimeException("Error occurred during delete. Please consult Logs");
        }
    }

    @PostMapping("/checkMedicine")
    public ResponseEntity<String> checkOneStock(@RequestBody OneMedicineStockDto medicineStockDto){
        try {
            String medicine = medService.checkOneMedicineStock(medicineStockDto);
            return ResponseEntity.status(HttpStatus.OK).body(medicine);
        } catch (RuntimeException e) {
            logger.error("Error when checking one Medicine stock for {}: {} ",medicineStockDto.getMedicineName(),e.getMessage(),e);
            throw new RuntimeException("Failed to fetch resource for stock view. Consult logs for error");
        }
    }
}
