package com.magizhchi.box.repository;

import com.magizhchi.box.entity.Device;
import com.magizhchi.box.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {

    Optional<Device> findByUserAndDeviceId(User user, String deviceId);

    List<Device> findByUserAndActiveTrue(User user);

    long countByUserAndActiveTrue(User user);

    List<Device> findByUser(User user);

    // Returns active devices ordered oldest-login-first so we can evict the LRU slot
    List<Device> findByUserAndActiveTrueOrderByLastLoginAtAsc(User user);

    /**
     * Atomic INSERT … ON CONFLICT DO UPDATE so concurrent login requests never
     * produce a duplicate-key error on the (user_id, device_id) unique constraint.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
        INSERT INTO devices
            (device_id, device_name, device_type, ip_address,
             first_login_at, last_login_at, active, user_id)
        VALUES
            (:deviceId, :deviceName, :deviceType, :ipAddress,
             NOW(), NOW(), true, :userId)
        ON CONFLICT (user_id, device_id) DO UPDATE SET
            device_name    = EXCLUDED.device_name,
            device_type    = EXCLUDED.device_type,
            ip_address     = EXCLUDED.ip_address,
            last_login_at  = NOW(),
            active         = true
        """, nativeQuery = true)
    void upsertDevice(@Param("deviceId")   String deviceId,
                      @Param("deviceName") String deviceName,
                      @Param("deviceType") String deviceType,
                      @Param("ipAddress")  String ipAddress,
                      @Param("userId")     Long   userId);
}
