package com.magizhchi.box.repository;

import com.magizhchi.box.entity.Device;
import com.magizhchi.box.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
