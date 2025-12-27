package com.pharmacy.pharmacy_management.exception;

public class NoInput extends IllegalArgumentException{
    public NoInput(String message){
        super("Empty input. Please fill in all required details");
    }
}
