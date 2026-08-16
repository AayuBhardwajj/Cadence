package com.cadence.content.repository;

import com.cadence.content.entity.WordBank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WordBankRepository extends JpaRepository<WordBank, UUID> {

    @Query(value = "SELECT * FROM public.get_random_words(:difficulty, :issueType, :topic, :limit)", nativeQuery = true)
    List<WordBank> getRandomWords(
            @Param("difficulty") String difficulty,
            @Param("issueType") String issueType,
            @Param("topic") String topic,
            @Param("limit") Integer limit
    );
}
