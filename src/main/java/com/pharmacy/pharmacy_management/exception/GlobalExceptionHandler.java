package com.pharmacy.pharmacy_management.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    //roles
    @ExceptionHandler(RolePermission.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    @ResponseBody
    public ErrorResponse handleRolePermissionException(RolePermission ex){
        return new ErrorResponse(ex.getMessage(), HttpStatus.FORBIDDEN.value());
    }

    //duplicate staff
    @ExceptionHandler(RolePermission.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    @ResponseBody
    public  ErrorResponse handleDuplicateStaffCreationException(DuplicateStaffCreation e){
        return new ErrorResponse(e.getMessage(), HttpStatus.CONFLICT.value());
    }

    //no input
    @ExceptionHandler(NoInput.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public ErrorResponse handleNoInput(NoInput ex){
        return new ErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST.value());
    }

    @ExceptionHandler(InvalidResourceRequest.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    @ResponseBody
    public ErrorResponse handleInvalidResourceRequest(InvalidResourceRequest ex){
        return new ErrorResponse(ex.getMessage(), HttpStatus.NOT_FOUND.value());
    }

}
