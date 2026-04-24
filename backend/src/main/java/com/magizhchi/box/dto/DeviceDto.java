package com.magizhchi.box.dto;

import com.magizhchi.box.entity.Device;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DeviceDto {
    private Long id;
    private String deviceId;
    private String deviceName;
    private String deviceType;
    private LocalDateTime firstLoginAt;
    private LocalDateTime lastLoginAt;
    private boolean active;

    public static DeviceDto from(Device device) {
        DeviceDto dto = new DeviceDto();
        dto.setId(device.getId());
        dto.setDeviceId(device.getDeviceId());
        dto.setDeviceName(device.getDeviceName());
        dto.setDeviceType(device.getDeviceType());
        dto.setFirstLoginAt(device.getFirstLoginAt());
        dto.setLastLoginAt(device.getLastLoginAt());
        dto.setActive(device.isActive());
        return dto;
    }
}
