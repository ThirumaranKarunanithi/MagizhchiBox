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
     * - If device already exists and is active → update lastLoginAt
     * - If device was deactivated → reactivate if quota allows
     * - If device is new → check limit, then create
     */
    @Transactional
    public void registerDevice(User user, String deviceId, String deviceName,
                               String deviceType, HttpServletRequest request) {
        Optional<Device> existingOpt = deviceRepository.findByUserAndDeviceId(user, deviceId);

        if (existingOpt.isPresent()) {
            Device device = existingOpt.get();
            if (!device.isActive()) {
                long activeCount = deviceRepository.countByUserAndActiveTrue(user);
                if (activeCount >= MAX_ACTIVE_DEVICES) {
                    throw new DeviceLimitExceededException(
                        "Maximum device limit (" + MAX_ACTIVE_DEVICES + ") reached. " +
                        "Please remove a device before logging in from this one.");
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
            long activeCount = deviceRepository.countByUserAndActiveTrue(user);
            if (activeCount >= MAX_ACTIVE_DEVICES) {
                throw new DeviceLimitExceededException(
                    "Maximum device limit (" + MAX_ACTIVE_DEVICES + ") reached. " +
                    "Please remove an existing device to log in from a new one.");
            }
            Device device = new Device();
            device.setUser(user);
            device.setDeviceId(deviceId);
            device.setDeviceName(deviceName != null ? deviceName : "Unknown Device");
            device.setDeviceType(deviceType != null ? deviceType : "Unknown");
            device.setIpAddress(extractIpAddress(request));
            device.setActive(true);
            deviceRepository.save(device);
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
