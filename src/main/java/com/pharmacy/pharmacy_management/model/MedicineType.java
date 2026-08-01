package com.pharmacy.pharmacy_management.model;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
public class MedicineType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long Id;

    @Column(unique = true, updatable = false, columnDefinition = "UUID")
    private UUID publicId;

    @Column(unique = true)
    private String name;

    private String description;

    @PrePersist
    private void generatePublicId() {
        if (this.publicId == null) this.publicId = UUID.randomUUID();
    }

    public UUID getPublicId() {
        return publicId;
    }

    public Long getId() {
        return Id;
    }

    public void setId(Long id) {
        Id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }
}
