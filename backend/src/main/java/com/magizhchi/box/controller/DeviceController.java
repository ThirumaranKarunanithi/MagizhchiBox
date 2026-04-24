package com.magizhchi.box.controller;

import com.magizhchi.box.dto.DeviceDto;
import com.magizhchi.box.entity.User;
import com.magizhchi.box.service.AuthService;
import com.magizhchi.box.service.DeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<List<DeviceDto>> listDevices(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(deviceService.getUserDevices(user));
    }

    @DeleteMapping("/{deviceId}")
    public ResponseEntity<Void> removeDevice(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String deviceId) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        deviceService.removeDevice(user, deviceId);
        return ResponseEntity.noContent().build();
    }
}
