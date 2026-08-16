package com.cadence.content.repository;

import com.cadence.content.entity.PassagePool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PassagePoolRepository extends JpaRepository<PassagePool, UUID> {

    @Query(value = "SELECT * FROM public.claim_pooled_passage(:topic, :difficulty)", nativeQuery = true)
    List<PassagePool> claimPooledPassage(
            @Param("topic") String topic,
            @Param("difficulty") String difficulty
    );

    long countByTopicAndDifficultyAndStatus(String topic, String difficulty, String status);

    @Query("SELECT p.topic AS topic, p.difficulty AS difficulty, COUNT(p) AS cnt " +
           "FROM PassagePool p WHERE p.status = 'available' " +
           "GROUP BY p.topic, p.difficulty")
    List<ComboCountProjection> getAvailableComboCounts();

    interface ComboCountProjection {
        String getTopic();
        String getDifficulty();
        Long getCnt();
    }

    Optional<PassagePool> findByPassageId(java.util.UUID passageId);
}
