package com.pharmacy.pharmacy_management.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private String message;
    private int status;
    private LocalDateTime timestamp;

    public ErrorResponse(String message, int status){
        this.message=message;
        this.timestamp=LocalDateTime.now();
        this.status=status;
    }


}
