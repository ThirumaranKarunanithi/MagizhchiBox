package com.magizhchi.box.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

@Component
@RequiredArgsConstructor
@Slf4j
public class S3HealthCheck implements ApplicationRunner {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.region:us-east-1}")
    private String region;

    @Value("${aws.access-key-id:NOT_SET}")
    private String accessKeyId;

    @Override
    public void run(ApplicationArguments args) {
        log.info("=== S3 Health Check ===");
        log.info("  Bucket : {}", bucketName);
        log.info("  Region : {}", region);
        log.info("  Key ID : {}...{}",
            accessKeyId.length() > 8 ? accessKeyId.substring(0, 4) : "????",
            accessKeyId.length() > 8 ? accessKeyId.substring(accessKeyId.length() - 4) : "????");

        if ("CHANGE_ME".equals(bucketName) || "CHANGE_ME".equals(accessKeyId)) {
            log.error("S3 credentials are not configured! Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME in Railway environment variables.");
            return;
        }

        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            log.info("  Status : OK — bucket '{}' is accessible", bucketName);
        } catch (Exception e) {
            log.error("  Status : FAILED — cannot access bucket '{}': {}", bucketName, e.getMessage());
            log.error("  Fix: check AWS credentials, region, and bucket name in Railway env vars.");
        }
        log.info("=======================");
    }
}
