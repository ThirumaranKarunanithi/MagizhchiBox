package com.magizhchi.box.dto;

import com.magizhchi.box.entity.FileMetadata;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FileMetadataDto {
    private Long id;
    private String originalFileName;
    private String contentType;
    private Long fileSizeBytes;
    private LocalDateTime uploadedAt;

    public static FileMetadataDto from(FileMetadata file) {
        FileMetadataDto dto = new FileMetadataDto();
        dto.setId(file.getId());
        dto.setOriginalFileName(file.getOriginalFileName());
        dto.setContentType(file.getContentType());
        dto.setFileSizeBytes(file.getFileSizeBytes());
        dto.setUploadedAt(file.getUploadedAt());
        return dto;
    }
}
