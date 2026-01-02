package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.*;
import com.pharmacy.pharmacy_management.exception.InvalidResourceRequest;
import com.pharmacy.pharmacy_management.exception.NoInput;
import com.pharmacy.pharmacy_management.model.Medicine;
import com.pharmacy.pharmacy_management.model.Sale;
import com.pharmacy.pharmacy_management.model.SaleItem;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.MedicineRepository;
import com.pharmacy.pharmacy_management.repository.SaleItemRepository;
import com.pharmacy.pharmacy_management.repository.SaleRepository;
import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class SaleService {
    @Autowired
    private SaleRepository saleRepo;
    @Autowired
    private SaleSanitizerService sanitizerService;
    @Autowired
    private StaffService staffService;
    @Autowired
    private MedicineRepository medicineRepository;
    @Autowired
    private SaleItemRepository saleItemRepository;


    private final Logger logger = LoggerFactory.getLogger(SaleService.class);
    private final ModelMapper modelMapper = new ModelMapper();

    @Transactional
    public void createSale(SaleCreationDto creationDto) {
        SaleCreationDto cleanedDto = sanitizerService.sanitizeCreated(creationDto);

        //map
        Sale sale = new Sale();
        sale.setClientName(cleanedDto.getClientName());
        sale.setClientPhone(cleanedDto.getClientPhone());
        sale.setSaleType(cleanedDto.getSaleType());
        sale.setPrescriptionInfo(cleanedDto.getPrescriptionInfo());

        List<SaleItem> items = new ArrayList<>();

        for (SaleItemDto itemDto : creationDto.getItems()) {
            Medicine medicine = medicineRepository.findByMedicineName(itemDto.getMedicineName())
                    .orElseThrow(() -> new InvalidResourceRequest("Cant find this medicine type"));

            if (medicine.getQuantity() < 1) logger.warn("Medicine {} stock used up", medicine.getMedicineName());

            medicine.setQuantity(medicine.getQuantity() - itemDto.getQuantity());
            if (medicine.getQuantity() < 0) logger.error("Stock management is invalid. More stock than cache");
            medicineRepository.save(medicine);

            SaleItem item = new SaleItem();
            item.setSale(sale);
            item.setMedicine(medicine);
            item.setPrice(itemDto.getPrice());
            item.setQuantity(itemDto.getQuantity());
            items.add(item);
        }
        double totals = items.stream()
                .mapToDouble(item -> item.getPrice().toBigInteger().doubleValue() * item.getQuantity())
                .sum();
        sale.setTotal(BigDecimal.valueOf(totals));
        sale.setItems(items);
        saleRepo.save(sale);
        logger.info("New Sale created. Amount: {}", sale.getTotal());
    }

    @Transactional
    public List<SalesSearchReturnDto> searchSale(SaleCheckDto delDto) {
        String cleanedName = delDto.getClientPhone()
                .replace("&lt;/?[a-zA-Z0-9]+&gt;", "")
                .strip();
        if (cleanedName.isBlank()) throw new NoInput("Please input a name");
        List<Sale> sales = saleRepo.findByClientPhone(cleanedName);
        if (sales.isEmpty()) throw new InvalidResourceRequest("No Sales tied to a Client with this Phone");
        return sales.stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    @PreAuthorize("hasRole('SUPERADMIN')")
    public void deleteSale(Long id) {
        {
            Staff current = staffService.currentUSer();
            Sale deleteSale = saleRepo.findById(id)
                    .orElseThrow(() -> new InvalidResourceRequest("Cant find this particular sale"));
            logger.info("Sale: {} {} {} was deleted by user {}", deleteSale.getClientName(), deleteSale.getPrescriptionInfo(), deleteSale.getTotal(), current.getName());
            saleRepo.delete(deleteSale);

        }
    }
    private SalesSearchReturnDto mapToDto(Sale sale){
        SalesSearchReturnDto returnDto = modelMapper.map(sale, SalesSearchReturnDto.class);
        returnDto.setId(sale.getId());
        returnDto.setSaleTime(sale.getSaleTime());
        returnDto.setTotal(sale.getTotal());
        return returnDto;
    }
    private SaleItemReturnDto mapToItemDto(SaleItemReturnDto returnDto){
        SaleItemReturnDto answer = new SaleItemReturnDto();
        answer.setMedSku(returnDto.getMedSku());
        answer.setQuantity(returnDto.getQuantity());
        answer.setPrice(returnDto.getPrice());
        return answer;
    }
    }
