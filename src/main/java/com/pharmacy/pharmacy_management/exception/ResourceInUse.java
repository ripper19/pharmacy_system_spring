package com.pharmacy.pharmacy_management.exception;

public class ResourceInUse extends RuntimeException{
    public ResourceInUse(String message){
        super(message);
    }
}
