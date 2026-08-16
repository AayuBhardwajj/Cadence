package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "daily_tips", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyTip {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "tip_date", nullable = false)
    private LocalDate tipDate;

    @Column(name = "tip_text", nullable = false)
    private String tipText;

    @Column(name = "is_personalized", nullable = false)
    private Boolean isPersonalized;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;
}
