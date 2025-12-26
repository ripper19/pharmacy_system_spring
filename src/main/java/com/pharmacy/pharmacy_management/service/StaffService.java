package com.pharmacy.pharmacy_management.service;

import com.pharmacy.pharmacy_management.dto.StaffCreateDto;
import com.pharmacy.pharmacy_management.dto.StaffUpdateDto;
import com.pharmacy.pharmacy_management.model.Role;
import com.pharmacy.pharmacy_management.model.Staff;
import com.pharmacy.pharmacy_management.repository.StaffRepository;
import com.pharmacy.pharmacy_management.security.RolePolicy;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import org.apache.catalina.valves.rewrite.InternalRewriteMap;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class StaffService {
    @Autowired
    private StaffRepository staffRepo;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();


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
            throw new RuntimeException("Can't delete yourself");
        }
        Staff staff = getStaffByPhone(dto.getPhoneNo())
                .orElseThrow(()-> new RuntimeException("Not found"));
        Role target = staff.getRole();
        if(!RolePolicy.canDelete(current.getRole(), target)){
            throw new RuntimeException("Not possible with your permissions");
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

    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
    @Transactional
    public Staff addUser(StaffCreateDto newStaff){
        try{
            Staff current = currentUSer();
            System.out.println("Current user" + current.getName() + "Role " + current.getRole());

            if(newStaff == null) throw new RuntimeException("Empty input");

            Role requestedRole = newStaff.getRole();
            if(requestedRole == null) {
                newStaff.setRole(Role.USER);
                requestedRole = newStaff.getRole();
            }
            if(!RolePolicy.canCreate(current.getRole(), requestedRole)){
                throw new RuntimeException("You dont have sufficient permissions to perform this action!!");
            }
                Staff staff = mapToEntity(newStaff);
                System.out.println("Requested role" + requestedRole + "Current role" + current.getRole());
                staff.setRole(requestedRole);

                String rawPass = staff.getPassword();
                staff.setPassword(passwordEncoder.encode(rawPass));

                Staff saved = staffRepo.save(staff);
                System.out.println("staff created, ID" + saved.getId());
                return saved;

            }catch (Exception e) {
            System.out.println("Error" + e.getClass().getName());
            System.out.println("message" + e.getMessage());
            e.printStackTrace();
            throw e;
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
        System.out.println("Current name" + currentUser.getName() + currentUser.getEmail());


        if(update.getRole() != null) throw new RuntimeException("Roles arent set here");

        Staff existing = staffRepo.findByPhoneNo(currentUser.getPhoneNo())
                .orElseThrow(() -> new RuntimeException("Wrong details"));

        if (update.getPassword() != null && !update.getPassword().isEmpty())
            existing.setPassword(passwordEncoder.encode(update.getPassword()));
        System.out.println("Password changed");
        if (update.getName() != null && !update.getName().isEmpty()) existing.setName(update.getName());
        System.out.println("Name changed to" + existing.getName());

        Staff updated = staffRepo.save(existing);
        System.out.println("Updated these new details" + existing.getName());
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
            staffRepo.save(root);
        }
        if(staffRepo.countByRole(Role.SUPERADMIN) > 1){
            throw new RuntimeException("Delete the extra Superadmin or contact developer");
        }
        if (staffRepo.countByRole(Role.ADMIN) > 5){
            throw new RuntimeException("PLease deescalate some admin. Admins are too many");
        }
    }
}