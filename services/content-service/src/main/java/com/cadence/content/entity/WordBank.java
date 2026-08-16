package com.cadence.content.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "word_bank", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WordBank {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "word_code")
    private String wordCode;

    @Column(name = "word", nullable = false)
    private String word;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "topic_fit")
    private String topicFit;

    @Column(name = "issue_type")
    private String issueType;

    @Column(name = "bucket")
    private String bucket;

    @Column(name = "active", nullable = false)
    private Boolean active;

    @Column(name = "verified_by_slp")
    private String verifiedBySlp;
}
