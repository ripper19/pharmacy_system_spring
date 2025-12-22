package com.pharmacy.pharmacy_management.security;

import com.pharmacy.pharmacy_management.model.Role;

public class RolePolicy {

    public static boolean canCreate(Role creator, Role target){
        if(target == Role.SUPERADMIN) return false;
        return creator.canManage(target);
    }
    public static boolean canUpdate(Role updater, Role target){
        if(target == Role.SUPERADMIN) return false;
        if(target == Role.ADMIN) return false;
        return updater == target;
    }
    public static boolean canDelete(Role deleter, Role target){
        if(target == Role.SUPERADMIN) return false;
        if(deleter == Role.USER) return false;
        return deleter.canManage(target);
    }

}
