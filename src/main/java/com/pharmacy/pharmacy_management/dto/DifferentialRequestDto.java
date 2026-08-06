package com.pharmacy.pharmacy_management.dto;

public record DifferentialRequestDto(
    String symptoms,
    Integer age,
    String sex,
    String duration,
    String notes
) {}
