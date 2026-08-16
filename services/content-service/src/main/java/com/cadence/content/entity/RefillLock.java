package com.cadence.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "refill_lock", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefillLock {

    @Id
    @Column(name = "lock_key")
    private Long lockKey;

    @Column(name = "is_locked")
    private Boolean isLocked;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;
}
