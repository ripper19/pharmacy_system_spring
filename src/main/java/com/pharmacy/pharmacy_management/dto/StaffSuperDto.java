package com.pharmacy.pharmacy_management.dto;

import com.pharmacy.pharmacy_management.model.Role;

public class StaffSuperDto {
    private String name;
    private String updEmail;
    private String phoneNo;
    private Role role;

    public String getName() {
        return name;
    }

    public String getUpdEmail() {
        return updEmail;
    }

    public String getPhoneNo() {
        return phoneNo;
    }

    public Role getRole() {
        return role;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setUpdEmail(String updEmail) {
        this.updEmail = updEmail;
    }

    public void setPhoneNo(String phoneNo) {
        this.phoneNo = phoneNo;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
