package com.pharmacy.pharmacy_management.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LinksController {

    @GetMapping("/")
    public String home(){
        return "forward:/index.html";
    }

    @GetMapping("/staff")
    public String staff(){
        return "forward:/staff.html";
    }

    @GetMapping("/inventory")
    public String inventory(){
        return "forward:/inventory.html";
    }

    @GetMapping("/sales")
    public String sales(){
        return "forward:/sales.html";
    }
}
