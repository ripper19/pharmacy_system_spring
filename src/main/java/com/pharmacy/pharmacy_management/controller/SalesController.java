package com.pharmacy.pharmacy_management.controller;

import com.pharmacy.pharmacy_management.dto.SaleCheckDto;
import com.pharmacy.pharmacy_management.dto.SaleCreationDto;
import com.pharmacy.pharmacy_management.dto.SalesSearchReturnDto;
import com.pharmacy.pharmacy_management.repository.SaleRepository;
import com.pharmacy.pharmacy_management.service.SaleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sale")
public class SalesController {
    @Autowired
    private SaleRepository saleRepository;
    @Autowired
    private SaleService saleService;
    private final Logger logger = LoggerFactory.getLogger(SalesController.class);

    @PostMapping("/sell")
    public ResponseEntity<String> makeSale(@RequestBody SaleCreationDto creationDto){
        try{
            saleService.createSale(creationDto);
            return ResponseEntity.status(HttpStatus.CREATED).body("Sale successfully created");
        } catch (RuntimeException e) {
            logger.error("Error occurred during sale creation: {}",e.getMessage(),e);
            throw e;
        }
    }

    @GetMapping("search_sales")
    public ResponseEntity<List<SalesSearchReturnDto>> searchSale(@RequestBody SaleCheckDto checkDto){
        List<SalesSearchReturnDto> search = saleService.searchSale(checkDto);
        return ResponseEntity.status(HttpStatus.OK).body(search);
    }

    @DeleteMapping("delete_sale")
    public ResponseEntity<String> deleteSale(Long id) {
        saleService.deleteSale(id);
        return ResponseEntity.status(HttpStatus.OK).body("Sale has been deleted");
    }

}
