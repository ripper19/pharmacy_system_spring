package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.*;
import com.pharmacy.pharmacy_management.exception.NoInput;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.ValidationException;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@Transactional(readOnly = true)
public class MedicineSanitiseService {

    private void ValidateRequiredFields(MedicineAddDto addDto){
        System.out.println("name: " + addDto.getMedicineName() +
                "type : " + addDto.getMedicineType() +
                "sku : " + addDto.getSku() +
                "description : " + addDto.getDescription());
        if(addDto.getMedicineName() == null || addDto.getMedicineName().isBlank()){
            throw new ValidationException("Empty name field ");
        }
        if(addDto.getSku() == null || addDto.getSku().strip().isBlank()){
            throw new ValidationException("Empty sku field");
        }
        if(addDto.getQuantity() == 0){
            throw new ValidationException("Quantity cannot be 0");
        }
    }
    private String sanitizeSku(String sku){
        return HtmlUtils.htmlEscape(sku)
                .replace("&lt;/?[a-zA-Z0-9]+&gt;","")
                .strip();
    }

    private String sanitizeName(String name){
        return HtmlUtils.htmlEscape(name
                .replace("&lt;/?[a-zA-Z0-9]+&gt;","")
                .strip());
    }
    private String sanitiseType(String type){
        return HtmlUtils.htmlEscape(type
                .replace("&lt;/?[a-zA-Z0-9]+&gt;","")
                .strip());
    }
    //sanitise description
    private String sanitizeDescriptor(String description){
        if (description == null) return null;
        String clean = description.strip();
        if (clean.isBlank()) return null;
        return HtmlUtils.htmlEscape(clean);
    }

    public MedicineAddDto sanitize(MedicineAddDto addDto){
        ValidateRequiredFields(addDto);
        addDto.setMedicineName(sanitizeName(addDto.getMedicineName()));
        addDto.setSku(sanitizeSku(addDto.getSku()));
        addDto.setDescription(sanitizeDescriptor(addDto.getDescription()));
        BigDecimal price = addDto.getCost();
        if (price != null){
            price = price.setScale(2, RoundingMode.HALF_UP);
        }
        addDto.setCost(price);

        return addDto;
    }


    private void validateRequiredUpdateFields(MedicineUpdateDto updateDto){
        if (updateDto.getMedicineName() == null ||updateDto.getMedicineName().isBlank()) throw new NoInput("Provide Medicine Name to be updated");
    }
    public MedicineUpdateDto sanitizeMedUpdate(MedicineUpdateDto updDto){
        validateRequiredUpdateFields(updDto);
        updDto.setMedicineName(sanitizeName(updDto.getMedicineName()));
        updDto.setDescription(sanitizeDescriptor(updDto.getDescription()));
        updDto.setSku(sanitizeSku(updDto.getSku()));
        return updDto;
    }


    private void validateTypeFields(MedicineTypeCreateDto dto){
        if (dto.getName() == null) throw new NoInput("Type name empty");
        if (dto.getDescription() == null) throw new NoInput("Description for type is empty");
    }
    public MedicineTypeCreateDto validateMedTypeCreation(MedicineTypeCreateDto dto){
        validateTypeFields(dto);
        if (dto.getName() != null) dto.setName(sanitizeName(dto.getName()));
        if (dto.getDescription() != null) dto.setDescription(sanitizeDescriptor(dto.getDescription()));

        return dto;
    }
    public String validateDeleteType(String name){
        if (name == null) throw new NoInput("Name to be deleted is empty");
        return sanitizeName(name);
    }

    public String validateGetNumberFromType(String type){
        if (type == null) throw new NoInput("NO Input");
        return sanitizeName(type);
    }

    public MedicineDeleteDto cleanDeleteDto(MedicineDeleteDto dto){
        if (dto.getName()!=null) dto.setName(sanitizeName(dto.getName()));
        if (dto.getSku()!=null) dto.setSku(sanitizeSku(dto.getSku()));
        return dto;
    }
    public MedicineCheckStockDto  sanitizeCheckStockDto(MedicineCheckStockDto dto){
        if(dto.getMedicineType() == null) throw new NoInput("No Data present");
        dto.setMedicineType(sanitiseType(dto.getMedicineType()));
        return dto;
    }
}
