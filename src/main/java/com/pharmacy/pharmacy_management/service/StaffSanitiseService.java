package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.StaffCreateDto;
import com.pharmacy.pharmacy_management.dto.StaffUpdateDto;
import com.pharmacy.pharmacy_management.exception.NoInput;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

@Service
@Transactional(readOnly = true)
public class StaffSanitiseService {

    //creation sanitation
    private void validateRequireCreatedFields(StaffCreateDto createDto){
        if (createDto.getName() == null) throw new NoInput("Empty Name when creating new staff");
        if (createDto.getEmail() == null) throw new NoInput("Empty email when creating new Staff");
        if (createDto.getPassword() == null) throw new NoInput("Password when creating new Staff cant be empty");
        if (createDto.getPhoneNo() == null) throw new NoInput("Phone number for staff creation cannot be empty");
    }
    private String sanitizeCreateName(String name){
        return HtmlUtils.htmlEscape(name);
    }
    private String sanitizeCreateEmail(String email){
        return HtmlUtils.htmlEscape(email);
    }
    private String sanitizeCreatePhone(String phoneNo){
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
}
