package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.MedicineAddDto;
import com.pharmacy.pharmacy_management.dto.MedicineDeleteDto;
import com.pharmacy.pharmacy_management.model.Medicine;
import com.pharmacy.pharmacy_management.model.MedicineType;
import com.pharmacy.pharmacy_management.repository.MedicineRepository;
import com.pharmacy.pharmacy_management.repository.MedicineTypeRepository;
import com.pharmacy.pharmacy_management.utilities.TransactionRetryUtility;
import jakarta.transaction.Transactional;
import jakarta.validation.ValidationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class MedicineService {
    @Autowired
    private MedicineRepository medicineRepo;
    @Autowired
    private MedicineSanitiseService medicineSanitiseService;
    @Autowired
    private MedicineTypeRepository medicineTypeRepository;
    @Autowired
    private TransactionRetryUtility transactionRetryUtility;

    public Optional<Medicine> getMedicineBy(String medicineName){
        return medicineRepo.findByMedicineName(medicineName);
    }

    public Medicine mapToEntity(MedicineAddDto dto){
        Medicine medicine = new Medicine();
        medicine.setMedicineName(dto.getMedicineName());
        medicine.setSku(dto.getSku());
        medicine.setQuantity(dto.getQuantity());
        medicine.setDescription(dto.getDescription());
        medicine.setDescription(dto.getDescription());
        medicine.setLowStockThreshold(dto.getLowStockThreshold());
        return medicine;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public Medicine addMedStock(MedicineAddDto addDto) {
        MedicineAddDto cleanedDto = medicineSanitiseService.sanitize(addDto);

        return transactionRetryUtility.executeWithRetry(()->{
        MedicineType type = medicineTypeRepository.findByIgnoreCaseName(cleanedDto.getMedicineType())
                .orElseThrow(()-> new ValidationException("Cant find this type in Medicine types. Add the type"));
        System.out.println("Medtype"+ type.getName());

        if (cleanedDto.getDescription() == null){
            cleanedDto.setDescription("Description hasn't been provided. Please input description and instructions for various uses");
        }
        if (cleanedDto.getLowStockThreshold() == null || cleanedDto.getLowStockThreshold() == 0){
            cleanedDto.setLowStockThreshold(50);
        }
        System.out.println("Medicine type being saved is " + cleanedDto.getMedicineType());
        Medicine newMed = mapToEntity(cleanedDto);
        newMed.setCost(BigDecimal.valueOf(0.00));
        newMed.setMed_type(type);
        return medicineRepo.save(newMed);
    });
    }

    //using add Dto since update uses same fields
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public Medicine updateMedStock(MedicineAddDto updateDto) {
        medicineSanitiseService.sanitize(updateDto);
        return transactionRetryUtility.executeWithRetry(() -> {
            Medicine existing = medicineRepo.findByMedicineName(updateDto.getMedicineName())
                    .orElseThrow(() -> new RuntimeException("Medicine doesnt exist. Add first"));
            MedicineType updating = medicineTypeRepository.findByIgnoreCaseName(updateDto.getMedicineType())
                    .orElseThrow(() -> new RuntimeException("This type isn't available in Medicine types"));

            existing.setMedicineName(updateDto.getMedicineName());
            existing.setDescription(updateDto.getDescription());
            existing.setSku(updateDto.getSku());
            existing.setMed_type(updating);
            existing.setQuantity(updateDto.getQuantity());
            return medicineRepo.save(existing);
        });
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String delMedStock(MedicineDeleteDto deleteDto){
        if (deleteDto.getName() == null) throw new RuntimeException("Empty request");

        medicineRepo.findByMedicineName(deleteDto.getName())
                .orElseThrow(()-> new RuntimeException("This medicine cant be found in database"));
        return "Medicine deleted" + deleteDto.getName();
    }
}
