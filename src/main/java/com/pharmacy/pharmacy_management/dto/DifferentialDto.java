package com.pharmacy.pharmacy_management.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

import java.util.List;

public record DifferentialDto(
    String condition,
    String likelihood,
    String reasoning,
    @JsonAlias({"suggested_actions", "suggestedActions"}) List<String> suggestedActions,
    @JsonAlias({"suggested_medicines", "suggestedMedicines"}) List<String> suggestedMedicines,
    @JsonAlias({"condition_code", "conditionCode"}) String conditionCode,
    @JsonAlias({"condition_name", "conditionName"}) String conditionName,
    Double probability
) {}
