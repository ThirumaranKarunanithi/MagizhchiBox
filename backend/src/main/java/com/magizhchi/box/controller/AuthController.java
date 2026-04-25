package com.magizhchi.box.controller;

import com.magizhchi.box.dto.AuthResponse;
import com.magizhchi.box.dto.LoginRequest;
import com.magizhchi.box.dto.SignupRequest;
import com.magizhchi.box.service.AuthService;
import com.magizhchi.box.service.OtpService;
import com.magizhchi.box.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;
    private final UserRepository userRepository;

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email address is already registered"));
        }
        otpService.generateAndSend(email);
        return ResponseEntity.ok(Map.of("message", "OTP sent to " + email));
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(
            @Valid @RequestBody SignupRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.signup(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Step 1 of password reset — send a 6-digit OTP to the email address.
     * Always returns 200 regardless of whether the email is registered.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        authService.sendPasswordResetOtp(email.trim().toLowerCase());
        return ResponseEntity.ok(Map.of("message",
                "If that email is registered, a reset code has been sent."));
    }

    /**
     * Step 2 of password reset — verify OTP and update password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        String email       = body.get("email");
        String otp         = body.get("otp");
        String newPassword = body.get("newPassword");

        if (email == null || otp == null || newPassword == null ||
                email.isBlank() || otp.isBlank() || newPassword.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email, OTP and new password are all required"));
        }
        if (newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Password must be at least 8 characters"));
        }
        authService.resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully. Please sign in."));
    }
}
