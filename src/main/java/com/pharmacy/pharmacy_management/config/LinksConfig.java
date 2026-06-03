package com.pharmacy.pharmacy_management.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class LinksConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry){
        registry.addViewController("/").setViewName("forward:/index.htm");
        registry.addViewController("/staff").setViewName("forward:/staff.html");
        registry.addViewController("/inventory").setViewName("forward:/inventroy.html");
        registry.addViewController("/dashboard").setViewName("forward:/dash.html");
        registry.addViewController("/sales").setViewName("forward:/sales.html");
    }
}
