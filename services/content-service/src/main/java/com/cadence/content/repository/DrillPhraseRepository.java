package com.cadence.content.repository;

import com.cadence.content.entity.DrillPhrase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DrillPhraseRepository extends JpaRepository<DrillPhrase, UUID> {

    List<DrillPhrase> findByOnsetAndLevelAndActiveTrueOrderByCreatedAtAsc(String onset, Short level);

    List<DrillPhrase> findByBucketAndLevelAndActiveTrueOrderByCreatedAtAsc(String bucket, Short level);

    Optional<DrillPhrase> findByPhraseTextIgnoreCase(String phraseText);
}

