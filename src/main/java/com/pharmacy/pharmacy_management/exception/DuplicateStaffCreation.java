package com.pharmacy.pharmacy_management.exception;

public class DuplicateStaffCreation extends RuntimeException{
    public DuplicateStaffCreation(String email){
        super("Staff with email " + email + " already exists");
    }
}
