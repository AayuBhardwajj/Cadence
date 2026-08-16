package com.cadence.content.repository;

import com.cadence.content.entity.GeneratedPassage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface GeneratedPassageRepository extends JpaRepository<GeneratedPassage, UUID> {
}
