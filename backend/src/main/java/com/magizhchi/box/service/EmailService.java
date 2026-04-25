package com.magizhchi.box.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtp(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("Magizhchi Box – Your Verification Code");
        message.setText(
            "Hello,\n\n" +
            "Your Magizhchi Box verification code is:\n\n" +
            "  " + otp + "\n\n" +
            "This code expires in 10 minutes. Do not share it with anyone.\n\n" +
            "If you did not request this, please ignore this email.\n\n" +
            "– Magizhchi Box"
        );
        mailSender.send(message);
        log.info("OTP email sent to {}", toEmail);
    }
}
