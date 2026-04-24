package com.magizhchi.box.service;

import com.magizhchi.box.dto.AuthResponse;
import com.magizhchi.box.dto.LoginRequest;
import com.magizhchi.box.dto.SignupRequest;
import com.magizhchi.box.entity.User;
import com.magizhchi.box.exception.ResourceNotFoundException;
import com.magizhchi.box.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final DeviceService deviceService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse signup(SignupRequest request, HttpServletRequest httpRequest) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email address is already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user = userRepository.save(user);

        // Register first device during signup
        deviceService.registerDevice(user, request.getDeviceId(),
                request.getDeviceName(), request.getDeviceType(), httpRequest);

        String token = jwtService.generateToken(user.getEmail(), user.getId(), request.getDeviceId());

        log.info("New user registered: {} (id={})", user.getEmail(), user.getId());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getName(),
                user.getStorageUsedBytes(), user.getStorageQuotaBytes());
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Device check & registration (throws DeviceLimitExceededException if limit hit)
        deviceService.registerDevice(user, request.getDeviceId(),
                request.getDeviceName(), request.getDeviceType(), httpRequest);

        String token = jwtService.generateToken(user.getEmail(), user.getId(), request.getDeviceId());

        log.info("User logged in: {} from device {}", user.getEmail(), request.getDeviceId());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getName(),
                user.getStorageUsedBytes(), user.getStorageQuotaBytes());
    }

    public User getCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
