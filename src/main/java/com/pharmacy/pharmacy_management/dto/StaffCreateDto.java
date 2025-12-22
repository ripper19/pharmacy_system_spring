package com.pharmacy.pharmacy_management.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pharmacy.pharmacy_management.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class StaffCreateDto {

    @NotBlank
    private String name;
    @NotBlank
    private String phoneNo;
    @Email
    private String email;
    @NotBlank
    private String password;
    private Role role;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhoneNo() {
        return phoneNo;
    }

    public void setPhoneNo(String phoneNo) {
        this.phoneNo = phoneNo;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
