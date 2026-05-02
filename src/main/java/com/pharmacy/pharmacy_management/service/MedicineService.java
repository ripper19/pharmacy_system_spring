package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.*;
import com.pharmacy.pharmacy_management.exception.InvalidResourceRequest;
import com.pharmacy.pharmacy_management.exception.NoInput;
import com.pharmacy.pharmacy_management.model.Medicine;
import com.pharmacy.pharmacy_management.model.MedicineStatus;
import com.pharmacy.pharmacy_management.model.MedicineType;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.MedicineRepository;
import com.pharmacy.pharmacy_management.repository.MedicineTypeRepository;
import com.pharmacy.pharmacy_management.utilities.TransactionRetryUtility;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MedicineService {

    private final MedicineRepository medicineRepo;

    private final MedicineSanitiseService medicineSanitiseService;

    private final MedicineTypeRepository medicineTypeRepository;

    private final TransactionRetryUtility transactionRetryUtility;

    private final StaffService staffService;
    private final Logger logger = LoggerFactory.getLogger(MedicineService.class);

    public Optional<Medicine> getMedicineByName(String medicineName) {
        return medicineRepo.findByMedicineName(medicineName);
    }

    public Medicine mapToEntity(MedicineAddDto dto) {
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
    public String addMedStock(MedicineAddDto addDto) {
        MedicineAddDto cleanedDto = medicineSanitiseService.sanitize(addDto);
        return transactionRetryUtility.executeWithRetry(() -> {
            try {
                Staff current = staffService.currentUSer();
                MedicineType type = medicineTypeRepository.findByIgnoreCaseName(cleanedDto.getMedicineType())
                        .orElseThrow(() -> new InvalidResourceRequest("Cant find this type in Medicine types. Add the type"));

                if (cleanedDto.getLowStockThreshold() == null || cleanedDto.getLowStockThreshold() == 0) {
                    cleanedDto.setLowStockThreshold(50);
                }
                Medicine newMed = mapToEntity(cleanedDto);
                newMed.setMed_type(type);

                medicineRepo.save(newMed);
                logger.info("New medicine {} added by {}", cleanedDto.getMedicineName(), current.getName());
                return("New Medicine" + cleanedDto.getMedicineName());
            } catch (Exception e) {
                logger.error("Failed to add {}: error {}", addDto.getMedicineName(), e.getMessage(), e);
                throw new RuntimeException("DB operation failed: " + e.getMessage());
            }
        });
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String updateMedStock(MedicineUpdateDto updateDto) {
        return transactionRetryUtility.executeWithRetry(() -> {
            try {
                MedicineUpdateDto cleaned =  medicineSanitiseService.sanitizeMedUpdate(updateDto);
                Staff current = staffService.currentUSer();
                Medicine existing = medicineRepo.findByMedicineName(cleaned.getMedicineName())
                        .orElseThrow(() -> new InvalidResourceRequest("Medicine doesnt exist. Add first"));

                MedicineType updating = medicineTypeRepository.findByIgnoreCaseName(cleaned.getMedicineType())
                        .orElseThrow(() -> new InvalidResourceRequest("This type isn't available in Medicine types"));
                List<String> updated = new ArrayList<>();
                if (cleaned.getMedicineName() != null || !cleaned.getMedicineName().isBlank()){
                    existing.setMedicineName(cleaned.getMedicineName());
                    updated.add("MedicineName");
                }
                if (cleaned.getDescription() != null || !cleaned.getDescription().isBlank()){
                    existing.setDescription(cleaned.getDescription());
                    updated.add("Medicine Description");
                }
                if (cleaned.getSku() != null || !cleaned.getSku().isBlank()){
                    existing.setSku(cleaned.getSku());
                    updated.add("Medicine Sku");
                }
                if (cleaned.getMedicineType() != null || !cleaned.getMedicineType().isBlank()){
                    existing.setMed_type(updating);
                    updated.add("Medicine medicine_Type");
                }
                if (cleaned.getQuantity() != null ){
                    existing.setQuantity(cleaned.getQuantity());
                    updated.add("Medicine Quantity");
                }
                medicineRepo.save(existing);
                //ALERT FOR QUANTITY CHANGES NOT MADE BY SUPERADMIN OR ANY OTHER FOR THAT MATTER
                if (updated.contains("Medicine Quantity")){
                    logger.warn("Quantity changed to {} for Medicine {} altered not involving sales by {}", cleaned.getQuantity(), existing.getMedicineName(),current.getName());
                }
                logger.info("Update on medicine {} by user {} with {} privileges", existing.getMedicineName(), current.getName(), current.getRole());
                return("Successfully updated : " +cleaned.getMedicineName());
            } catch (Exception e) {
                logger.info("Update failed: {} ", e.getMessage(),e);
                throw new RuntimeException(e);
            }
        });
    }



    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    public String delMedStock(MedicineDeleteDto deleteDto) {
        return transactionRetryUtility.executeWithRetry(() -> {
            try {
                Staff current = staffService.currentUSer();
                MedicineDeleteDto cleaned = medicineSanitiseService.cleanDeleteDto(deleteDto);

                Medicine toDelete = medicineRepo.findBySku(cleaned.getSku())
                        .orElseThrow(() -> new InvalidResourceRequest("This medicine cant be found in database"));

                if (toDelete.getMedicineName().equals(cleaned.getName())){
                    logger.warn("Incompatible options {} {}",deleteDto.getName(),deleteDto.getSku());
                    throw new InvalidResourceRequest("Units dont match");
                }
                medicineRepo.delete(toDelete);
                logger.info("Medicine deleted: {} by user {} with {} privileges", cleaned.getName(), current.getName(), current.getRole());
                return "Medicine deleted" + cleaned.getName();
            } catch (Exception e) {
                logger.error("Failed to delete medicine {} initiated by user {}",deleteDto.getName(),staffService.currentUSer().getName());
                throw new RuntimeException(e);
            }
        });
    }

//check medicine stock by type
    @Transactional(readOnly = true)
    public List<MedicineView> checkMedicineStock(MedicineCheckStockDto checkStockDto ){
        try {
            MedicineCheckStockDto cleaned = medicineSanitiseService.sanitizeCheckStockDto(checkStockDto);
            if(cleaned == null) throw new NoInput("No item present for checking");
            MedicineType type = medicineTypeRepository.findByIgnoreCaseName(cleaned.getMedicineType())
                    .orElseThrow(()-> new InvalidResourceRequest("No such type"));

            return medicineRepo.findByMedType(type);
        } catch (Exception e) {
            logger.error("Failed to get medicines: {}",e.getMessage(),e);
            throw new RuntimeException(e);
        }
    }


    @Transactional(readOnly = true)
    public MedicineStockView checkOneMedicineStock(OneMedicineStockDto oneMedicineStockDto) {
        try {
            String cleaned = HtmlUtils.htmlEscape(oneMedicineStockDto.getMedicineName());
            if (cleaned.isBlank()) throw new NoInput("Empty input");

            Medicine medicine = medicineRepo.findByMedicineName(cleaned)
                    .orElseThrow(() -> new InvalidResourceRequest("Medicine not found"));

            return new MedicineStockView(
                    medicine.getMedicineName(),
                    medicine.getQuantity(),
                    medicine.getLowStockThreshold(),
                    medicine.getMed_type(),
                    medicine.getCost(),
                    medicine.getStatus()
            );
        } catch (Exception e) {
            logger.error("Failed to fetch record: {}",e.getMessage(),e);
            throw new RuntimeException(e);
        }
    }

        public record MedicineStockView(String medicineName,
                                        int quantity,
                                        int threshold,
                                        MedicineType type,
                                        BigDecimal cost,
                                        MedicineStatus status) {
        }
        public record  MedicineView(String medicineName,
                                    int quantity,
                                    MedicineStatus status,
                                    BigDecimal cost){}
}







