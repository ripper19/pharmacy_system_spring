package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.StaffCreateDto;
import com.pharmacy.pharmacy_management.dto.StaffDeleteDto;
import com.pharmacy.pharmacy_management.dto.StaffSuperDto;
import com.pharmacy.pharmacy_management.dto.StaffUpdateDto;
import com.pharmacy.pharmacy_management.exception.*;
import com.pharmacy.pharmacy_management.model.Role;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.StaffRepository;
import com.pharmacy.pharmacy_management.security.RolePolicy;
import jakarta.annotation.PostConstruct;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffService {
    @Autowired
    private StaffRepository staffRepo;
    @Autowired
    StaffSanitiseService staffSanitiseService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Logger logger = LoggerFactory.getLogger(StaffService.class);


    public Optional<Staff> getStaffByPhone(String phoneNo) {
        return staffRepo.findByPhoneNo(phoneNo);
    }

    public Staff currentUSer(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String loggedUser = (authentication != null) ? authentication.getName() : null;

        return staffRepo.findByEmail(loggedUser)
                .orElseThrow(()-> new RuntimeException("NO such user"));
    }
    @PostConstruct
    public void init() {
        logger.info("StaffService instantiated: {}", this.hashCode());
    }
    public Staff mapToEntity(StaffCreateDto dto){
        Staff s = new Staff();
        s.setName(dto.getName());
        s.setEmail(dto.getEmail());
        s.setPhoneNo(dto.getPhoneNo());
        s.setRole(dto.getRole());

        return s;
    }
    public Staff mapUpdateToEntity(StaffUpdateDto dto){
        Staff s = new Staff();
        s.setName(dto.getName());
        s.setEmail(dto.getEmail());
        s.setPhoneNo(dto.getPhoneNo());
        s.setPassword(dto.getPassword());
        s.setRole(dto.getRole());

        return s;
    }

    //DELETE
    @CacheEvict(value = "staff", allEntries = true)
    @PreAuthorize("hasRole('SUPERADMIN') or hasRole('ADMIN')")
    public void deleteStaff(StaffDeleteDto dto) {
        Staff current = currentUSer();
        Staff existing = staffRepo.findByEmail(dto.getEmail())
                .orElseThrow(()-> new WrongUser("User cant be found"));
        if(!dto.getId().equals(existing.getId())){
            throw new InvalidResourceRequest("incompatible params given");
        }
        if (!RolePolicy.canDelete(current.getRole(),existing.getRole())){
            logger.info("Wrong info provided for {} by {}", existing.getName(),current.getName());
            throw new RolePermission("Insufficient privileges");
        }
        logger.info("User {} deleted by {}",existing.getName(),current.getName());
        staffRepo.delete(existing);
    }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @Transactional
    public Staff escalateAdmin(Staff escStaff) {
        escStaff.setRole(escStaff.getRole());
        return staffRepo.save(escStaff);
    }



    //ADD/CREATION
    @CacheEvict(value = "staff", allEntries = true)
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    @Transactional
    public void addUser(StaffCreateDto newStaff){
        try{
            Staff current = currentUSer();

            if(newStaff == null) throw new NoInput("Empty input");
            StaffCreateDto cleanStaff = staffSanitiseService.sanitizeStaffCreate(newStaff);


            Role requestedRole = cleanStaff.getRole();
            if(requestedRole == null) {
                cleanStaff.setRole(Role.USER);
                requestedRole = cleanStaff.getRole();
            }
            if(!RolePolicy.canCreate(current.getRole(), requestedRole)){
                logger.warn("{} attempted an invalid operation of adding {} with role {}", current.getName(), cleanStaff.getName(), requestedRole);
                throw new RolePermission("You dont have sufficient privileges to perform this action");
            }
                Staff staff = mapToEntity(cleanStaff);
                staff.setRole(requestedRole);

                staff.setPassword(passwordEncoder.encode("Password123"));

                Staff saved = staffRepo.save(staff);
            logger.info("Staff created {}with ID {}", saved.getName(), saved.getId());

        }catch (DuplicateStaffCreation e) {
            assert newStaff != null;
            logger.error("Duplicate staff creation request for {}", newStaff.getEmail());
            throw new DuplicateStaffCreation(newStaff.getEmail());
        }
    }






    @PreAuthorize("hasRole('SUPERADMIN')")
    @Transactional
    public Staff changePassword(Staff staff) {
        Staff existing = staffRepo.findByPhoneNo(staff.getPhoneNo())
                .orElseThrow(() -> new RuntimeException("Wrong phone number"));
        if (staff.getPassword() != null) staff.setPassword(passwordEncoder.encode(staff.getPassword()));
        return staffRepo.save(staff);
    }


    //UPDATE. CLEAN. THIS IS VERY WRONG!!!
    @CacheEvict(value = "staff", allEntries = true)
    @Transactional
    @PreAuthorize("#update.email == authentication.name")
    public Staff updateUser(StaffUpdateDto update) {
            Staff currentUser = currentUSer();
            StaffUpdateDto cleaned = staffSanitiseService.sanitizeStaffUpdate(update);
            logger.info("Update initiated by {}", currentUser.getName());

            if (update.getRole() != null) throw new RolePermission("Roles cant be set here");

        List <String> changedDetails = new ArrayList<>();

            Staff existing = staffRepo.findByPhoneNo(currentUser.getPhoneNo())
                    .orElseThrow(() -> new InvalidResourceRequest("Wrong User requested"));

            if (update.getPassword() != null && !update.getPassword().isEmpty()) {
                existing.setPassword(passwordEncoder.encode(update.getPassword()));
                logger.info("Users {} password has been changed", currentUser.getName());
                changedDetails.add("name");
            }

            if (update.getName() != null && !update.getName().isEmpty()) {
                existing.setName(update.getName());
                logger.info("Name changed to {}", update.getName());
                changedDetails.add("password");
            }

            Staff updated = staffRepo.save(existing);
            logger.info("Details for user {} updated: {}, ", currentUser.getName(), changedDetails);
            return updated;
    }

    @PreAuthorize("hasRole('SUPERADMIN')")
    public Staff findUser(String email){
        return staffRepo.findByEmail(email)
                .orElseThrow(()-> new InvalidResourceRequest("Invalid Staff Request"));
    }

    @CacheEvict(value = "staff", allEntries = true)
    @Transactional
    @PreAuthorize("hasRole('SUPERADMIN')")
    public Staff updateSuper(String email, StaffSuperDto updateDto){
        StaffSuperDto cleaned = staffSanitiseService.sanitizeSuperDto(updateDto);
        Staff existingUser = staffRepo.findByEmail(email)
                .orElseThrow(()->new WrongUser("No Such user"));

        if (cleaned.getName() != null) existingUser.setName(cleaned.getName());

        if (cleaned.getUpdEmail() != null ) existingUser.setEmail(cleaned.getUpdEmail());
        if (cleaned.getPhoneNo() != null) existingUser.setPhoneNo(cleaned.getPhoneNo());
        if (cleaned.getRole() != null) existingUser.setRole(cleaned.getRole());
        logger.info("User {} updated", existingUser.getName());
        staffRepo.save(existingUser);
        return existingUser;
    }

    @PostConstruct
    public void createDefaultSp() {
        if (staffRepo.countByRole(Role.SUPERADMIN) == 0) {
            Staff root = new Staff();
            root.setName("root");
            root.setEmail("root@example.com");
            root.setPhoneNo("0700000000");
            root.setRole(Role.SUPERADMIN);
            root.setPassword(passwordEncoder.encode("password123"));
            logger.info("Default Superuser created.Advise Client to change superuser");
            staffRepo.save(root);
        }
        if(staffRepo.countByRole(Role.SUPERADMIN) > 1){
            throw new RuntimeException("Delete the extra Superadmin or contact developer");
        }
        if (staffRepo.countByRole(Role.ADMIN) > 5){
            throw new RuntimeException("Please deescalate some admin. Admins are too many");
        }
    }

    @Cacheable(value = "staff", key = "'all'")
    @Transactional(readOnly = true)
    public List<AllDto> getAll(){
        List<Staff> allStaff = staffRepo.findAll();
        return allStaff.stream()
                .map(staff->new AllDto(
                        staff.getName(),
                        staff.getEmail(),
                        staff.getId(),
                        staff.getRole(),
                        staff.getPhoneNo(),
                        staff.getDateJoined()
                )).toList();
    }
    public record AllDto (String name,String email, Long Id, Role role, String phoneNo, LocalDateTime joined) implements Serializable{}

}