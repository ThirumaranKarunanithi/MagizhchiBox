package com.magizhchi.box.service;

import com.magizhchi.box.dto.FileMetadataDto;
import com.magizhchi.box.entity.FileMetadata;
import com.magizhchi.box.entity.Folder;
import com.magizhchi.box.entity.User;
import com.magizhchi.box.exception.ResourceNotFoundException;
import com.magizhchi.box.exception.StorageQuotaExceededException;
import com.magizhchi.box.repository.FileMetadataRepository;
import com.magizhchi.box.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final FileMetadataRepository fileMetadataRepository;
    private final UserRepository userRepository;
    private final FolderService folderService;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.presigned-url-expiry-minutes}")
    private long presignedUrlExpiryMinutes;

    @Transactional
    public FileMetadataDto uploadFile(User user, MultipartFile file, Long folderId, String relativePath) throws IOException {
        long fileSize = file.getSize();

        if (user.getStorageUsedBytes() + fileSize > user.getStorageQuotaBytes()) {
            throw new StorageQuotaExceededException(
                String.format("Storage quota exceeded. Available: %s, Required: %s",
                    formatBytes(user.getStorageQuotaBytes() - user.getStorageUsedBytes()),
                    formatBytes(fileSize)));
        }

        // Resolve folder (null = root)
        Folder folder = folderService.resolveFolderEntity(user, folderId);

        // Some browsers send the full relative path as filename — keep only the last segment
        String rawName = file.getOriginalFilename();
        String originalFileName = (rawName != null && rawName.contains("/"))
                ? rawName.substring(rawName.lastIndexOf('/') + 1)
                : rawName;
        String s3Key;
        if (relativePath != null && !relativePath.isBlank()) {
            s3Key = "user-" + user.getId() + "/" + sanitizePath(relativePath);
        } else {
            String safeFileName = sanitizeFileName(originalFileName);
            s3Key = "user-" + user.getId() + "/" + UUID.randomUUID() + "_" + safeFileName;
        }

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(file.getContentType())
                .contentLength(fileSize)
                .build();

        try {
            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), fileSize));
        } catch (Exception e) {
            log.error("S3 upload failed — bucket='{}' key='{}' error='{}'", bucketName, s3Key, e.getMessage());
            throw e;
        }

        FileMetadata metadata = new FileMetadata();
        metadata.setUser(user);
        metadata.setOriginalFileName(originalFileName);
        metadata.setS3Key(s3Key);
        metadata.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        metadata.setFileSizeBytes(fileSize);
        metadata.setFolder(folder);
        fileMetadataRepository.save(metadata);

        user.setStorageUsedBytes(user.getStorageUsedBytes() + fileSize);
        userRepository.save(user);

        log.info("File uploaded: '{}' to folder={} for user {}", originalFileName, folderId, user.getEmail());
        return FileMetadataDto.from(metadata);
    }

    /** List files in a specific folder (null = root). */
    public List<FileMetadataDto> listFiles(User user, Long folderId) {
        if (folderId == null) {
            return fileMetadataRepository
                    .findByUserAndFolderIsNullAndDeletedFalseOrderByUploadedAtDesc(user)
                    .stream().map(FileMetadataDto::from).collect(Collectors.toList());
        }
        Folder folder = folderService.resolveFolderEntity(user, folderId);
        return fileMetadataRepository
                .findByUserAndFolderAndDeletedFalseOrderByUploadedAtDesc(user, folder)
                .stream().map(FileMetadataDto::from).collect(Collectors.toList());
    }

    public String generatePresignedDownloadUrl(User user, Long fileId) {
        FileMetadata metadata = fileMetadataRepository.findByIdAndUserAndDeletedFalse(fileId, user)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(metadata.getS3Key())
                .responseContentDisposition("attachment; filename=\"" + metadata.getOriginalFileName() + "\"")
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(presignedUrlExpiryMinutes))
                .getObjectRequest(getRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    /**
     * Deletes a file from both S3 and the database.
     * S3 is deleted first; if it fails the exception propagates and DB is unchanged.
     * Frontend only receives 204 after both succeed.
     */
    @Transactional
    public void deleteFile(User user, Long fileId) {
        FileMetadata metadata = fileMetadataRepository.findByIdAndUserAndDeletedFalse(fileId, user)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        String s3Key = metadata.getS3Key();
        String fileName = metadata.getOriginalFileName();

        // 1. Delete from S3 — if this throws, DB transaction rolls back (file stays visible)
        log.info("S3 delete — bucket='{}' key='{}'", bucketName, s3Key);
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build());
        log.info("S3 delete succeeded — key='{}'", s3Key);

        // 2. Soft-delete in DB
        metadata.setDeleted(true);
        metadata.setDeletedAt(LocalDateTime.now());
        fileMetadataRepository.save(metadata);

        user.setStorageUsedBytes(Math.max(0, user.getStorageUsedBytes() - metadata.getFileSizeBytes()));
        userRepository.save(user);

        log.info("File deleted: '{}' for user {}", fileName, user.getEmail());
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "file";
        return fileName.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }

    private String sanitizePath(String relativePath) {
        return Arrays.stream(relativePath.split("/"))
            .map(p -> p.replaceAll("[^a-zA-Z0-9._\\- ]", "_").trim())
            .filter(p -> !p.isEmpty() && !p.equals(".") && !p.equals(".."))
            .collect(Collectors.joining("/"));
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        return String.format("%.1f GB", bytes / (1024.0 * 1024 * 1024));
    }
}
