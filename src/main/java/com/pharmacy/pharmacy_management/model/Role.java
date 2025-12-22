package com.pharmacy.pharmacy_management.model;

public enum Role {
    SUPERADMIN(2),
    ADMIN(1),
    USER(0);

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
