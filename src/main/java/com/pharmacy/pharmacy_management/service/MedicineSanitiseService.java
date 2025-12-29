package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.MedicineAddDto;
import com.pharmacy.pharmacy_management.dto.MedicineUpdateDto;
import com.pharmacy.pharmacy_management.exception.NoInput;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.ValidationException;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
@Transactional(readOnly = true)
public class MedicineSanitiseService {

    //validate required fields first
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
    //sanitise sku
    private String sanitizeSku(String sku){
        return HtmlUtils.htmlEscape(sku)
                .replace("&lt;/?[a-zA-Z0-9]+&gt;","")
                .strip();
    }

    //sanitise name
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
}
