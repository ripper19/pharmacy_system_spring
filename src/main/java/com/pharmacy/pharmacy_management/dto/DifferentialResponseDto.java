package com.pharmacy.pharmacy_management.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

import java.util.List;

public record DifferentialResponseDto(
    List<DifferentialDto> differentials,
    @JsonAlias({"red_flags", "redFlags"}) List<String> redFlags,
    @JsonAlias({"needs_urgent_care", "needsUrgentCare"}) boolean needsUrgentCare,
    String disclaimer
) {}
