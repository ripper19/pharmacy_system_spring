package com.pharmacy.pharmacy_management;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class PharmacyManagementApplication {

	public static void main(String[] args) {
		SpringApplication.run(PharmacyManagementApplication.class, args);
	}

}
