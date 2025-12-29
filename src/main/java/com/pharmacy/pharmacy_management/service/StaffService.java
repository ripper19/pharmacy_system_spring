package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.StaffCreateDto;
import com.pharmacy.pharmacy_management.dto.StaffUpdateDto;
import com.pharmacy.pharmacy_management.exception.*;
import com.pharmacy.pharmacy_management.model.Role;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.StaffRepository;
import com.pharmacy.pharmacy_management.security.RolePolicy;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;

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
    public Staff mapToEntity(StaffCreateDto dto){
        Staff s = new Staff();
        s.setName(dto.getName());
        s.setEmail(dto.getEmail());
        s.setPhoneNo(dto.getPhoneNo());
        s.setPassword(dto.getPassword());
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
    @PreAuthorize("hasRole('SUPERADMIN') or hasRole('ADMIN')")
    public Staff deleteStaff(StaffUpdateDto dto) {
        Staff current = currentUSer();
        if (dto.getPhoneNo().equals(current.getPhoneNo())){
            logger.warn("User {} attempted to delete own account", current.getName());
            throw new InvalidResourceRequest("Cant delete yourself");
        }
        Staff staff = getStaffByPhone(dto.getPhoneNo())
                .orElseThrow(()-> new InvalidResourceRequest("No such user"));
        Role target = staff.getRole();
        if(!RolePolicy.canDelete(current.getRole(), target)){
            logger.warn("User {} tried deleting user{} with no sufficient privileges", current.getName(), dto.getName());
            throw new RolePermission("Insufficient privileges");
        }

        staffRepo.delete(staff);
        return staff;
    }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @Transactional
    public Staff escalateAdmin(Staff escStaff) {
        escStaff.setRole(escStaff.getRole());
        return staffRepo.save(escStaff);
    }



    //ADD/CREATION
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    @Transactional
    public Staff addUser(StaffCreateDto newStaff){
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
                logger.warn("{} attempted an invalid operation of adding {} with role {}", currentUSer().getName(), cleanStaff.getName(), requestedRole);
                throw new RolePermission("You dont have sufficient privileges to perform this action");
            }
                Staff staff = mapToEntity(cleanStaff);
                staff.setRole(requestedRole);

                String rawPass = staff.getPassword();
                staff.setPassword(passwordEncoder.encode(rawPass));

                Staff saved = staffRepo.save(staff);
            logger.info("Staff created {}with ID {}", saved.getName(), saved.getId());
                return saved;

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


    //UPDATE
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
}