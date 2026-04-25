package com.magizhchi.box.service;

import com.magizhchi.box.dto.DeviceDto;
import com.magizhchi.box.entity.Device;
import com.magizhchi.box.entity.User;
import com.magizhchi.box.exception.DeviceLimitExceededException;
import com.magizhchi.box.exception.ResourceNotFoundException;
import com.magizhchi.box.repository.DeviceRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceService {

    private static final int MAX_ACTIVE_DEVICES = 2;
    private final DeviceRepository deviceRepository;

    /**
     * Registers a device on login/signup.
     *
     * Rules (in order):
     * 1. Same device ID already active  → just update lastLoginAt / name / IP (no slot consumed).
     * 2. Same device ID but deactivated → reactivate. If slots are full, evict the LRU device first.
     * 3. Brand-new device ID            → if slots are full, evict the LRU device, then create.
     *
     * "Evict LRU" means we silently deactivate the device that signed in least recently.
     * This lets a user reinstall the app on the same physical phone (which now uses a stable
     * hardware UUID via @capacitor/device) without ever hitting the limit — because after the
     * first reinstall the hardware UUID matches the existing record (rule 1).
     * Stale slots from older installs that used random localStorage UUIDs are automatically
     * rotated out on the next login.
     */
    @Transactional
    public void registerDevice(User user, String deviceId, String deviceName,
                               String deviceType, HttpServletRequest request) {
        Optional<Device> existingOpt = deviceRepository.findByUserAndDeviceId(user, deviceId);

        if (existingOpt.isPresent()) {
            // ── Case 1 / 2: known device (active or previously deactivated) ──────────
            Device device = existingOpt.get();
            if (!device.isActive()) {
                long activeCount = deviceRepository.countByUserAndActiveTrue(user);
                if (activeCount >= MAX_ACTIVE_DEVICES) {
                    evictLeastRecentlyUsed(user);
                }
                device.setActive(true);
                device.setFirstLoginAt(LocalDateTime.now());
            }
            device.setLastLoginAt(LocalDateTime.now());
            device.setDeviceName(deviceName);
            device.setDeviceType(deviceType);
            device.setIpAddress(extractIpAddress(request));
            deviceRepository.save(device);

        } else {
            // ── Case 3: brand-new device ID ──────────────────────────────────────────
            long activeCount = deviceRepository.countByUserAndActiveTrue(user);
            if (activeCount >= MAX_ACTIVE_DEVICES) {
                evictLeastRecentlyUsed(user);
            }
            // Use an atomic upsert so that two concurrent login requests hitting this
            // branch simultaneously never produce a duplicate-key constraint error.
            deviceRepository.upsertDevice(
                deviceId,
                deviceName != null ? deviceName : "Unknown Device",
                deviceType != null ? deviceType : "Unknown",
                extractIpAddress(request),
                user.getId()
            );
        }
    }

    /**
     * Deactivates the active device that signed in least recently (LRU eviction).
     * Called only when a valid login would otherwise exceed MAX_ACTIVE_DEVICES.
     */
    private void evictLeastRecentlyUsed(User user) {
        List<Device> active = deviceRepository
                .findByUserAndActiveTrueOrderByLastLoginAtAsc(user);
        if (!active.isEmpty()) {
            Device lru = active.get(0);
            log.info("Evicting LRU device '{}' (id={}) for user {} to make room for new login",
                     lru.getDeviceName(), lru.getDeviceId(), user.getEmail());
            lru.setActive(false);
            deviceRepository.save(lru);
        }
    }

    public List<DeviceDto> getUserDevices(User user) {
        return deviceRepository.findByUser(user)
                .stream()
                .map(DeviceDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeDevice(User user, String deviceId) {
        Device device = deviceRepository.findByUserAndDeviceId(user, deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        device.setActive(false);
        deviceRepository.save(device);
    }

    private String extractIpAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
