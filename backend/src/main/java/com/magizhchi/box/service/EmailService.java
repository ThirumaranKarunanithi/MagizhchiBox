package com.magizhchi.box.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class EmailService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${resend.api-key}")
    private String resendApiKey;

    @Value("${mail.from:no-reply@magizhchi.software}")
    private String fromEmail;

    private static final String RESEND_URL = "https://api.resend.com/emails";

    public void sendOtp(String toEmail, String otp) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(resendApiKey);

        Map<String, Object> body = Map.of(
            "from",    "Magizhchi Box <" + fromEmail + ">",
            "to",      List.of(toEmail),
            "subject", "Magizhchi Box – Your Verification Code",
            "text",
                "Hello,\n\n" +
                "Your Magizhchi Box verification code is:\n\n" +
                "        " + otp + "\n\n" +
                "This code expires in 10 minutes.\n" +
                "Do not share it with anyone.\n\n" +
                "If you did not request this, you can safely ignore this email.\n\n" +
                "– Magizhchi Box"
        );

        restTemplate.postForObject(RESEND_URL, new HttpEntity<>(body, headers), String.class);
        log.info("OTP email sent via Resend to {}", toEmail);
    }
}
