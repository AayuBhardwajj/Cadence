package com.cadence.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "profiles", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile {

    @Id
    private UUID id;

    @Column(name = "tier", nullable = false)
    private String tier;
}
