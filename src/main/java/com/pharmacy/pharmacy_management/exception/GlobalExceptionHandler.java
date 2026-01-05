package com.pharmacy.pharmacy_management.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    //roles
    @ExceptionHandler(RolePermission.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    @ResponseBody
    public ErrorResponse handleRolePermissionException(RolePermission ex){
        return new ErrorResponse(ex.getMessage(), HttpStatus.FORBIDDEN.value());
    }

    //duplicate staff
    @ExceptionHandler(DuplicateStaffCreation.class)
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

    @ExceptionHandler(duplicateMedicineType.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    @ResponseBody
    public ErrorResponse handleDuplicateMedicineTypes(duplicateMedicineType ex){
        return new ErrorResponse(ex.getMessage(), HttpStatus.CONFLICT.value());
    }

    @ExceptionHandler(ResourceInUse.class)
    @ResponseStatus(HttpStatus.FOUND)
    @ResponseBody
    public ErrorResponse handleOptimisticLocks(ResourceInUse ex){
        return new ErrorResponse(ex.getMessage(), HttpStatus.FOUND.value());
    }

    @ExceptionHandler(WrongUser.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    @ResponseBody
    public ErrorResponse handleWrongPasswords(WrongUser ex){
        return new ErrorResponse(ex.getMessage(), HttpStatus.NOT_FOUND.value());
    }
}
