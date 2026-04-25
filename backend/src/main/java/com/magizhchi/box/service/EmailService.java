package com.magizhchi.box.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final SesClient sesClient;

    @Value("${mail.from:no-reply@magizhchi.software}")
    private String fromEmail;

    public void sendOtp(String toEmail, String otp) {
        SendEmailRequest request = SendEmailRequest.builder()
                .source(fromEmail)
                .destination(Destination.builder().toAddresses(toEmail).build())
                .message(Message.builder()
                        .subject(Content.builder()
                                .data("Magizhchi Box – Your Verification Code")
                                .charset("UTF-8")
                                .build())
                        .body(Body.builder()
                                .text(Content.builder()
                                        .data(
                                            "Hello,\n\n" +
                                            "Your Magizhchi Box verification code is:\n\n" +
                                            "        " + otp + "\n\n" +
                                            "This code expires in 10 minutes.\n" +
                                            "Do not share it with anyone.\n\n" +
                                            "If you did not request this, you can safely ignore this email.\n\n" +
                                            "– Magizhchi Box"
                                        )
                                        .charset("UTF-8")
                                        .build())
                                .build())
                        .build())
                .build();

        sesClient.sendEmail(request);
        log.info("OTP email sent via SES to {}", toEmail);
    }
}
