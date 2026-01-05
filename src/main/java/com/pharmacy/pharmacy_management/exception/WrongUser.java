package com.pharmacy.pharmacy_management.exception;

public class WrongUser extends RuntimeException{
    public WrongUser(String message){
        super(message);
    }
}
