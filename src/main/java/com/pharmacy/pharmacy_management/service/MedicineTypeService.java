package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.MedicineTypeCreateDto;
import com.pharmacy.pharmacy_management.dto.MedicineTypeDeleteDto;
import com.pharmacy.pharmacy_management.dto.MedicineTypeUpdateDto;
import com.pharmacy.pharmacy_management.exception.InvalidResourceRequest;
import com.pharmacy.pharmacy_management.exception.NoInput;
import com.pharmacy.pharmacy_management.exception.duplicateMedicineType;
import com.pharmacy.pharmacy_management.model.MedicineType;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.MedicineTypeRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class MedicineTypeService {

    @Autowired
    private MedicineTypeRepository medTypeRepo;
    @Autowired
    private StaffService staffService;
    private final Logger logger = LoggerFactory.getLogger(MedicineTypeService.class);

    public Optional<MedicineType> getMedicineTypeByName(String name){
        return medTypeRepo.findByIgnoreCaseName(name);
    }

    public MedicineType mapToEntity(MedicineTypeCreateDto dto){
        MedicineType medType = new MedicineType();
        medType.setName(dto.getName());
        medType.setDescription(dto.getDescription());
        return medType;
    }
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String addMedType(MedicineTypeCreateDto addDto){
        Staff current = staffService.currentUSer();
        if(addDto.getName() == null || addDto.getName().trim().isEmpty()){
            throw new NoInput("Medicine Type name cant be empty");
        }
        if(addDto.getDescription() == null || addDto.getDescription().trim().isEmpty()){
            throw new NoInput("Description cant be null");
        }
        String cleanName = HtmlUtils.htmlEscape(addDto.getName()
                .replace("/&\\#?[a-z0-9]+;/i\"", "")
                .strip());
        String cleanDescription = HtmlUtils.htmlEscape(addDto.getDescription()
                .replace("/&\\#?[a-z0-9]+;/i\"", "")
                .strip());



        if (medTypeRepo.findByIgnoreCaseName(cleanName).isPresent()){
            throw new duplicateMedicineType("Type already exists" + cleanName);
        }
        addDto.setName(cleanName.toUpperCase());
        addDto.setDescription(cleanDescription);
        MedicineType add = mapToEntity(addDto);
        medTypeRepo.save(add);
        logger.info("Added medicine type {} by user {} with {} privileges",addDto.getName(),current.getName(),current.getRole() );
        return ("Medicine Type: " +cleanName+ " added");
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String delMedType(MedicineTypeDeleteDto delDto){
        Staff current = staffService.currentUSer();
        if(delDto.getName() == null || delDto.getName().strip().isBlank()){
            throw new NoInput("Name cannot be empty");
        }
        String cleaned = delDto.getName()
                .replace("/&\\#?[a-z0-9]+;/i\"", "")
                .strip();

        MedicineType type = medTypeRepo.findByIgnoreCaseName(cleaned)
                .orElseThrow(()-> new InvalidResourceRequest("Can't Find this entry. Add before deleting"));
        medTypeRepo.delete(type);
        logger.info("Medicine Type {} deleted by {}", cleaned,current.getName());
        return ("deleted Medicine type " + cleaned);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String updateMedType(MedicineTypeUpdateDto updDto){
        Staff current = staffService.currentUSer();
        MedicineType type = medTypeRepo.findByIgnoreCaseName(updDto.getCurrentName())
                .orElseThrow(()-> new InvalidResourceRequest("Cant find field to update"));
        List<String> updated = new ArrayList<>();
        if(updDto.getUpdateName() != null || !updDto.getUpdateName().strip().isBlank()){
            type.setName(updDto.getUpdateName()
                    .replace("/&\\#?[a-z0-9]+;/i\"", "")
                    .strip());
            updated.add("Medicine Type name");
        }
        if(updDto.getDescription() != null && !updDto.getDescription().strip().isBlank()){
            type.setDescription(updDto.getDescription()
                    .replace("/&\\#?[a-z0-9]+;/i\"", "")
                    .strip());
            updated.add("Medicine Type Description");
        }
        medTypeRepo.save(type);
        logger.info("Updated Medicine Type {} {} fields", updated.get(0), updated.get(1));
        return ("Medicine Type "+updDto.getCurrentName()+" changed");
    }
}
