package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.StaffCreateDto;
import com.pharmacy.pharmacy_management.dto.StaffDeleteDto;
import com.pharmacy.pharmacy_management.dto.StaffSuperDto;
import com.pharmacy.pharmacy_management.dto.StaffUpdateDto;
import com.pharmacy.pharmacy_management.exception.NoInput;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

@Service
@Transactional(readOnly = true)
public class StaffSanitiseService {

    private Logger logger = LoggerFactory.getLogger(StaffSanitiseService.class);
    //creation sanitation
    private void validateRequireCreatedFields(StaffCreateDto createDto){
        if (createDto.getName() == null) throw new NoInput("Empty Name when creating new staff");
        if (createDto.getEmail() == null) throw new NoInput("Empty email when creating new Staff");
        if (createDto.getPhoneNo() == null) throw new NoInput("Phone number for staff creation cannot be empty");
    }
    private String sanitizeCreateName(String name){
        if(name==null) return null;
        return HtmlUtils.htmlEscape(name);
    }
    private String sanitizeCreateEmail(String email){
        if(email==null) return null;
        return HtmlUtils.htmlEscape(email);
    }
    private String sanitizeCreatePhone(String phoneNo){
        if(phoneNo==null) return null;
        return HtmlUtils.htmlEscape(phoneNo);
    }

    public StaffCreateDto sanitizeStaffCreate(StaffCreateDto createDto){
        validateRequireCreatedFields(createDto);
        createDto.setName(sanitizeCreateName(createDto.getName()));
        createDto.setEmail(sanitizeCreateEmail(createDto.getEmail()));
        createDto.setPhoneNo(sanitizeCreatePhone(createDto.getPhoneNo()));
        return createDto;
    }

    //update
    public StaffUpdateDto sanitizeStaffUpdate(StaffUpdateDto updDto){
        updDto.setName(sanitizeCreateName(updDto.getName()));
        updDto.setPhoneNo(sanitizeCreatePhone(updDto.getPhoneNo()));
        return updDto;
    }

    public StaffSuperDto sanitizeSuperDto(StaffSuperDto updDto){
        if (updDto.getName()!=null)updDto.setName(sanitizeCreateName(updDto.getName()));
        if (updDto.getUpdEmail()!=null)updDto.setUpdEmail(sanitizeCreateEmail(updDto.getUpdEmail()));
        if (updDto.getPhoneNo()!=null)updDto.setPhoneNo(sanitizeCreatePhone(updDto.getPhoneNo()));
        logger.info("Data being sanitised {} {} {} {}com", updDto.getPhoneNo(), updDto.getName(), updDto.getRole(), updDto.getUpdEmail());
        return updDto;
    }

    public StaffDeleteDto sanitizeDeleteDto(StaffDeleteDto dto) {
        if(dto == null) throw new IllegalArgumentException("Empty details!!");
        dto.setEmail(sanitizeCreateEmail(dto.getEmail()));

        return dto;
    }
}
