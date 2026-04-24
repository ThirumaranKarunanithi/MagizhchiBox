package com.magizhchi.box.controller;

import com.magizhchi.box.dto.FileMetadataDto;
import com.magizhchi.box.entity.User;
import com.magizhchi.box.service.AuthService;
import com.magizhchi.box.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;
    private final AuthService authService;

    /**
     * Upload a file. Pass folderId to place it in a folder; omit for root.
     * For folder uploads the frontend calls this once per file, each with the
     * correct folderId for its position in the hierarchy.
     */
    @PostMapping("/upload")
    public ResponseEntity<FileMetadataDto> uploadFile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) Long folderId) throws IOException {
        User user = authService.getCurrentUser(userDetails.getUsername());
        FileMetadataDto dto = fileService.uploadFile(user, file, folderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /** List files in a folder. Omit folderId to list root files. */
    @GetMapping
    public ResponseEntity<List<FileMetadataDto>> listFiles(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(value = "folderId", required = false) Long folderId) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(fileService.listFiles(user, folderId));
    }

    @GetMapping("/{fileId}/download-url")
    public ResponseEntity<Map<String, String>> getDownloadUrl(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        String url = fileService.generatePresignedDownloadUrl(user, fileId);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        fileService.deleteFile(user, fileId);
        return ResponseEntity.noContent().build();
    }
}
