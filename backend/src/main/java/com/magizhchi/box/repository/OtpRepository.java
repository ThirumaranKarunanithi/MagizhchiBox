package com.magizhchi.box.repository;

import com.magizhchi.box.entity.OtpRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<OtpRecord, Long> {

    Optional<OtpRecord> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    @Transactional
    @Modifying
    @Query("DELETE FROM OtpRecord o WHERE o.email = :email")
    void deleteByEmail(@Param("email") String email);

    @Transactional
    @Modifying
    @Query("DELETE FROM OtpRecord o WHERE o.expiresAt < :now")
    void deleteExpired(@Param("now") LocalDateTime now);
}
