package com.cadence.content.repository;

import com.cadence.content.entity.UserDrillPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserDrillPlanRepository extends JpaRepository<UserDrillPlan, UUID> {

    Optional<UserDrillPlan> findByUserId(UUID userId);
}

