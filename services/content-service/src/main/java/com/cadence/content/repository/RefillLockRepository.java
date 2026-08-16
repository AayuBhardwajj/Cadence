package com.cadence.content.repository;

import com.cadence.content.entity.RefillLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface RefillLockRepository extends JpaRepository<RefillLock, Long> {

    @Query(value = "SELECT public.try_refill_lock()", nativeQuery = true)
    Boolean tryRefillLock();

    @Query(value = "SELECT public.unlock_refill()", nativeQuery = true)
    Boolean unlockRefill();
}
