package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.MedicineTypeCreateDto;
import com.pharmacy.pharmacy_management.exception.InvalidResourceRequest;
import com.pharmacy.pharmacy_management.exception.duplicateMedicineType;
import com.pharmacy.pharmacy_management.model.MedicineType;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.MedicineTypeRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class MedicineTypeService {

    private final MedicineTypeRepository medTypeRepo;

    private final StaffService staffService;

    private final MedicineSanitiseService medicineSanitiseService;

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

    @CacheEvict(value = "MedicineType", allEntries = true)
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String addMedType(MedicineTypeCreateDto addDto){
        Staff current = staffService.currentUSer();
        MedicineTypeCreateDto cleaned = medicineSanitiseService.validateMedTypeCreation(addDto);

        if (medTypeRepo.findByIgnoreCaseName(cleaned.getName()).isPresent()){
            throw new duplicateMedicineType("Type already exists" + cleaned.getName());
        }
        addDto.setName(cleaned.getName().toUpperCase());
        addDto.setDescription(cleaned.getDescription());
        MedicineType add = mapToEntity(addDto);
        medTypeRepo.save(add);
        logger.info("Added medicine type {} by user {} with {} privileges",addDto.getName(),current.getName(),current.getRole() );
        return ("Medicine Type: " +cleaned.getName()+ " added");
    }


    @CacheEvict(value = "MedicineType", allEntries = true)
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String delMedType(String name){
        Staff current = staffService.currentUSer();
        String cleaned = medicineSanitiseService.validateDeleteType(name);

        MedicineType type = medTypeRepo.findByIgnoreCaseName(cleaned)
                .orElseThrow(()-> new InvalidResourceRequest("Can't Find this entry. Add before deleting"));
        medTypeRepo.delete(type);
        logger.info("Medicine Type {} deleted by {}", cleaned,current.getName());
        return ("Deleted Medicine type " + cleaned);
    }

    @Cacheable(value = "MedicineType", key = "'all'")
    @Transactional
    public List<Typenames> getAllMedTypes(){
        List<MedicineType> all = medTypeRepo.findAll();

        return all.stream()
                .map(type -> new Typenames(
                        type.getName()
                )).toList();
    }
    public record Typenames(String name){}

    @Transactional
    public Long getNumberMedicineInType(String type){
        String cleaned = medicineSanitiseService.validateGetNumberFromType(type);
        medTypeRepo.findByIgnoreCaseName(cleaned)
                .orElseThrow(()-> new InvalidResourceRequest("Resource Doesnt exist"));
        return medTypeRepo.countByMedType(cleaned);
    }
}
