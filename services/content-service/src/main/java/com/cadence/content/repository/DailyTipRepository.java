package com.cadence.content.repository;

import com.cadence.content.entity.DailyTip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DailyTipRepository extends JpaRepository<DailyTip, UUID> {

    Optional<DailyTip> findByUserIdAndTipDate(UUID userId, LocalDate tipDate);
}
