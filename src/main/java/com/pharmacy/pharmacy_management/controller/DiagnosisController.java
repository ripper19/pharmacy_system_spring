package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.DifferentialRequestDto;
import com.pharmacy.pharmacy_management.dto.DifferentialResponseDto;
import com.pharmacy.pharmacy_management.exception.DiagnosisServiceException;
import com.pharmacy.pharmacy_management.service.DiagnosisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/diagnosis")
public class DiagnosisController {

    @Autowired
    private DiagnosisService diagnosisService;
    private final Logger logger = LoggerFactory.getLogger(DiagnosisController.class);

    @PostMapping("/differential")
    public ResponseEntity<DifferentialResponseDto> differential(@RequestBody DifferentialRequestDto request) {
        try {
            DifferentialResponseDto result = diagnosisService.generateDifferential(request);
            return ResponseEntity.status(HttpStatus.OK).body(result);
        } catch (DiagnosisServiceException e) {
            logger.error("Diagnosis service failure: {}", e.getMessage(), e);
            throw e;
        } catch (RuntimeException e) {
            logger.error("Unexpected error during differential diagnosis: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate differential. Please consult logs.");
        }
    }
}
