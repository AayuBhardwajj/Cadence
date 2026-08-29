package com.cadence.content.repository;

import com.cadence.content.entity.DailyTip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DailyTipRepository extends JpaRepository<DailyTip, UUID> {

    Optional<DailyTip> findByUserIdAndTipDate(UUID userId, LocalDate tipDate);

    /**
     * Idempotent insert matching the daily_tips_user_id_tip_date_key unique constraint.
     * Uses INSERT ... ON CONFLICT DO NOTHING so concurrent callers (e.g. React StrictMode
     * double-invoke, two open tabs) never race to a 23505 DataIntegrityViolationException.
     * The caller must re-fetch via findByUserIdAndTipDate() after this call to get the
     * persisted row — which may have been written by a concurrent request, not this one.
     *
     * Pattern follows PassagePoolRepository.claimPooledPassage() native-query style.
     */
    @Modifying
    @Query(value = """
            INSERT INTO daily_tips (user_id, tip_date, tip_text, is_personalized, generated_at)
            VALUES (:userId, :tipDate, :tipText, :isPersonalized, :generatedAt)
            ON CONFLICT (user_id, tip_date) DO NOTHING
            """, nativeQuery = true)
    void insertIgnoreConflict(
            @Param("userId") UUID userId,
            @Param("tipDate") LocalDate tipDate,
            @Param("tipText") String tipText,
            @Param("isPersonalized") boolean isPersonalized,
            @Param("generatedAt") OffsetDateTime generatedAt
    );
}
