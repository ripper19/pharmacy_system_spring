package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.MedicineTypeCreateDto;
import com.pharmacy.pharmacy_management.dto.MedicineTypeDeleteDto;
import com.pharmacy.pharmacy_management.dto.MedicineTypeUpdateDto;
import com.pharmacy.pharmacy_management.model.MedicineType;
import com.pharmacy.pharmacy_management.repository.MedicineTypeRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class MedicineTypeService {

    @Autowired
    private MedicineTypeRepository medTypeRepo;

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
    public MedicineType addMedType(MedicineTypeCreateDto addDto){
        if(addDto.getName() == null || addDto.getName().trim().isEmpty()){
            throw new RuntimeException("Medicine Type name cant be empty");
        }
        if(addDto.getDescription() == null || addDto.getDescription().trim().isEmpty()){
            throw new RuntimeException("Description cant be null");
        }
        String cleanName = addDto.getName().strip();
        String cleanDescription = addDto.getDescription().strip();

        if (medTypeRepo.findByIgnoreCaseName(cleanName).isPresent()){
            throw new RuntimeException("Type already exists" + cleanName);
        }
        addDto.setName(cleanName.toUpperCase());
        addDto.setDescription(cleanDescription);
        MedicineType add = mapToEntity(addDto);
        return medTypeRepo.save(add);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String delMedType(MedicineTypeDeleteDto delDto){
        if(delDto.getName() == null || delDto.getName().strip().isBlank()){
            throw new RuntimeException("Name cannot be empty");
        }
        String cleaned = delDto.getName().strip();
        MedicineType type = medTypeRepo.findByIgnoreCaseName(cleaned)
                .orElseThrow(()-> new RuntimeException("Can't Find this entry. Add before deleting"));
        medTypeRepo.delete(type);
        return ("deleted Medicine type " + cleaned);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public MedicineType updateMedType(MedicineTypeUpdateDto updDto){
        MedicineType type = medTypeRepo.findByIgnoreCaseName(updDto.getCurrentName())
                .orElseThrow(()-> new RuntimeException("Cant find field to update"));
        if(updDto.getUpdateName() != null || !updDto.getUpdateName().strip().isBlank()){
            type.setName(updDto.getUpdateName().strip());
        }
        if(updDto.getDescription() != null && !updDto.getDescription().strip().isBlank()){
            type.setDescription(updDto.getDescription());
        }
        return medTypeRepo.save(type);
    }
}
