package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.saleCreationDto;
import com.pharmacy.pharmacy_management.exception.NoInput;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
public class SaleSanitizerService {
    private void validateRequiredCreation(saleCreationDto creationDto){
        if (creationDto.getClientName() == null || creationDto.getClientName().isBlank()){
            throw new NoInput("Enter Valid Data");
        }
        if (creationDto.getClientPhone()==null || creationDto.getClientPhone().isBlank()) throw new NoInput("Enter Valid Data");
        if (creationDto.getPrescriptionInfo()==null || creationDto.getPrescriptionInfo().isBlank()) throw new NoInput("Enter Valid data");
        if (creationDto.getSaleType()==null || creationDto.getSaleType().isBlank()) throw new NoInput("Enter Valid Data");
    }

    private String sanitizeName(String name){
        return HtmlUtils.htmlEscape(name
                .replace("&lt;/?[a-zA-Z0-9]+&gt;","")
                .strip());
    }
    private String sanitizePhone(String phone){
        return HtmlUtils.htmlEscape(phone
                .replace("&lt;/?[a-zA-Z0-9]+&gt;","")
                .strip());
    }
    private String sanitizePrescription(String prescription){
        return HtmlUtils.htmlEscape(prescription
                .replace("&lt;/?[a-zA-Z0-9]+&gt;","")
                .strip());
    }
    private String sanitizeSaleType(String sale){
        return HtmlUtils.htmlEscape(sale
                .replace("&lt;/?[a-zA-Z0-9]+&gt;","")
                .strip());
    }

    public saleCreationDto sanitizeCreated(saleCreationDto createdDto){
        validateRequiredCreation(createdDto);
        createdDto.setClientName(sanitizeName(createdDto.getClientName()));
        createdDto.setClientPhone(sanitizePhone(createdDto.getClientPhone()));
        createdDto.setPrescriptionInfo(sanitizePrescription(createdDto.getPrescriptionInfo()));
        createdDto.setSaleType(sanitizeSaleType(createdDto.getSaleType()));
        return createdDto;
    }
}
