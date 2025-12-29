package com.pharmacy.pharmacy_management.exception;

public class duplicateMedicineType extends RuntimeException{
    public duplicateMedicineType(String message){
        super("Duplicate Entry. Medicine Type already exists");
    }
}
