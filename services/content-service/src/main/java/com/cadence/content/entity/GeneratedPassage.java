package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "generated_passages", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratedPassage {

    @Id
    private UUID id;

    @Column(name = "passage_text", nullable = false)
    private String passageText;

    @Column(name = "difficulty", nullable = false)
    private String difficulty;

    @Column(name = "topic", nullable = false)
    private String topic;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_words", columnDefinition = "jsonb")
    private String targetWords;

    @Column(name = "word_count", nullable = false)
    private Integer wordCount;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;
}
