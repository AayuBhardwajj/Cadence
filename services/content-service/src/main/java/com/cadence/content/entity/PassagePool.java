package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "passage_pool", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PassagePool {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "passage_id", nullable = false)
    private UUID passageId;

    @Column(name = "topic", nullable = false)
    private String topic;

    @Column(name = "difficulty", nullable = false)
    private String difficulty;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "served_at")
    private OffsetDateTime servedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
