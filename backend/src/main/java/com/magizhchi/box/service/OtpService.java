package com.magizhchi.box.service;

import com.magizhchi.box.entity.OtpRecord;
import com.magizhchi.box.repository.OtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final OtpRepository otpRepository;
    private final EmailService emailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    // Not @Transactional — each repo call auto-commits so the OTP record
    // is persisted before the email is attempted. An email failure never
    // rolls back the saved OTP.
    public void generateAndSend(String email) {
        otpRepository.deleteByEmail(email);   // auto-committed

        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        OtpRecord record = new OtpRecord();
        record.setEmail(email);
        record.setOtp(otp);
        record.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        otpRepository.save(record);           // auto-committed

        // Runs outside any DB transaction — an exception here propagates to
        // the controller (returns 500) but the OTP row is already in the DB.
        emailService.sendOtp(email, otp);
        log.info("OTP generated and sent to {}", email);
    }

    /**
     * Returns true and marks OTP used if valid; false if invalid or expired.
     */
    @Transactional
    public boolean verify(String email, String otp) {
        Optional<OtpRecord> opt = otpRepository
                .findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email);

        if (opt.isEmpty()) {
            log.warn("OTP verify failed — no active OTP for {}", email);
            return false;
        }

        OtpRecord record = opt.get();

        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("OTP verify failed — expired for {}", email);
            return false;
        }

        if (!record.getOtp().equals(otp)) {
            log.warn("OTP verify failed — wrong code for {}", email);
            return false;
        }

        record.setUsed(true);
        otpRepository.save(record);
        log.info("OTP verified successfully for {}", email);
        return true;
    }
}
