package com.magizhchi.box.controller;

import com.magizhchi.box.dto.CreateFolderRequest;
import com.magizhchi.box.dto.FolderDto;
import com.magizhchi.box.entity.User;
import com.magizhchi.box.service.AuthService;
import com.magizhchi.box.service.FolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<FolderDto> createFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateFolderRequest request) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        FolderDto dto = folderService.createFolder(user, request.getName(), request.getParentId());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /** List sub-folders. Omit parentId to list root folders. */
    @GetMapping
    public ResponseEntity<List<FolderDto>> listFolders(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long parentId) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(folderService.listFolders(user, parentId));
    }

    @GetMapping("/{folderId}")
    public ResponseEntity<FolderDto> getFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long folderId) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(folderService.getFolder(user, folderId));
    }

    @DeleteMapping("/{folderId}")
    public ResponseEntity<Void> deleteFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long folderId) {
        User user = authService.getCurrentUser(userDetails.getUsername());
        folderService.deleteFolder(user, folderId);
        return ResponseEntity.noContent().build();
    }
}
