package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "drill_phrases", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrillPhrase {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "onset")
    private String onset;

    @Column(name = "bucket")
    private String bucket;

    @Column(name = "level", nullable = false)
    private Short level;

    @Column(name = "phrase_text", nullable = false)
    private String phraseText;

    @Column(name = "word_count", nullable = false)
    private Integer wordCount;

    @Column(name = "source", nullable = false)
    private String source;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}

