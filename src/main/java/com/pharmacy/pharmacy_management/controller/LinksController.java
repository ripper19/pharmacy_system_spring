package com.pharmacy.pharmacy_management.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Controller
public class LinksController {

    @GetMapping("/")
    public String home(){
        return "forward:/index.html";
    }
}
