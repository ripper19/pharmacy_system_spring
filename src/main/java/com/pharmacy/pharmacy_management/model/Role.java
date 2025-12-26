package com.pharmacy.pharmacy_management.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonValue;

@JsonFormat(shape = JsonFormat.Shape.STRING)
public enum Role {
    SUPERADMIN(2),
    ADMIN(1),
    USER(0);

    @JsonCreator
    public static Role fromString(String role){
        if (role == null || role.isBlank()) throw new IllegalArgumentException("Role cant be null");
        try{
            return Role.valueOf(role.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role given: " + role + "consult for functional roles");
        }
    }
    @JsonValue
    public String toJson(){
        return this.name();
    }
    private final int hierachyLevel;

    Role(int hierachyLevel){
        this.hierachyLevel = hierachyLevel;
    }

    public int getHierachyLevel() {
        return hierachyLevel;
    }

    public boolean canManage(Role other){
        return this.hierachyLevel > other.getHierachyLevel();
    }
}
