package com.magizhchi.box.service;

import com.magizhchi.box.dto.FolderDto;
import com.magizhchi.box.entity.FileMetadata;
import com.magizhchi.box.entity.Folder;
import com.magizhchi.box.entity.User;
import com.magizhchi.box.exception.ResourceNotFoundException;
import com.magizhchi.box.repository.FileMetadataRepository;
import com.magizhchi.box.repository.FolderRepository;
import com.magizhchi.box.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FolderService {

    private final FolderRepository folderRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final UserRepository userRepository;
    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Transactional
    public FolderDto createFolder(User user, String name, Long parentId) {
        Folder parent = null;
        if (parentId != null) {
            parent = folderRepository.findByIdAndUser(parentId, user)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent folder not found"));
        }

        // Return existing folder if name already taken at this level (idempotent / get-or-create)
        Optional<Folder> existing = (parent == null)
                ? folderRepository.findByUserAndNameAndParentIsNull(user, name)
                : folderRepository.findByUserAndNameAndParent(user, name, parent);

        if (existing.isPresent()) {
            return FolderDto.from(existing.get());
        }

        Folder folder = new Folder();
        folder.setUser(user);
        folder.setName(name);
        folder.setParent(parent);
        Folder saved = folderRepository.save(folder);

        log.info("Folder created: '{}' (id={}) for user {}", name, saved.getId(), user.getEmail());
        return FolderDto.from(saved);
    }

    public List<FolderDto> listFolders(User user, Long parentId) {
        if (parentId == null) {
            return folderRepository.findByUserAndParentIsNullOrderByNameAsc(user)
                    .stream().map(FolderDto::from).collect(Collectors.toList());
        }
        Folder parent = folderRepository.findByIdAndUser(parentId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        return folderRepository.findByUserAndParentOrderByNameAsc(user, parent)
                .stream().map(FolderDto::from).collect(Collectors.toList());
    }

    public FolderDto getFolder(User user, Long folderId) {
        Folder folder = folderRepository.findByIdAndUser(folderId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        return FolderDto.from(folder);
    }

    public void deleteFolder(User user, Long folderId) {
        List<String> s3Keys = deleteFolderInDb(user, folderId);
        s3Keys.forEach(this::deleteFromS3BestEffort);
    }

    @Transactional
    protected List<String> deleteFolderInDb(User user, Long folderId) {
        Folder folder = folderRepository.findByIdAndUser(folderId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));

        // Collect every folder ID in the subtree, leaves first
        List<Long> ids = new ArrayList<>();
        collectIdsLeafFirst(user, folder, ids);

        // Soft-delete all active files in these folders and collect their S3 keys
        List<FileMetadata> activeFiles = fileMetadataRepository.findActiveByFolderIds(ids);
        List<String> s3Keys = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        long freedBytes = 0;
        for (FileMetadata fm : activeFiles) {
            fm.setDeleted(true);
            fm.setDeletedAt(now);
            fm.setFolder(null);
            s3Keys.add(fm.getS3Key());
            freedBytes += fm.getFileSizeBytes();
        }
        if (!activeFiles.isEmpty()) {
            fileMetadataRepository.saveAll(activeFiles);
            user.setStorageUsedBytes(Math.max(0, user.getStorageUsedBytes() - freedBytes));
            userRepository.save(user);
        }

        // Detach already-soft-deleted files so FK is clear for folder delete
        fileMetadataRepository.detachFilesFromFolders(ids);

        // Delete folders leaf-first so FK (parent_id) is never violated
        folderRepository.bulkDeleteByIds(ids);

        log.info("Folder '{}' (id={}) and {} sub-folder(s) deleted, {} file(s) removed for user {}",
                folder.getName(), folderId, ids.size() - 1, activeFiles.size(), user.getEmail());
        return s3Keys;
    }

    private void deleteFromS3BestEffort(String s3Key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build());
            log.debug("S3 object deleted: {}", s3Key);
        } catch (Exception e) {
            log.warn("S3 delete failed for key '{}': {}", s3Key, e.getMessage());
        }
    }

    /** Depth-first post-order traversal: children before parents. */
    private void collectIdsLeafFirst(User user, Folder folder, List<Long> ids) {
        for (Folder sub : folderRepository.findByUserAndParent(user, folder)) {
            collectIdsLeafFirst(user, sub, ids);
        }
        ids.add(folder.getId());
    }

    /** Resolve a Folder entity for use by FileService (null → root). */
    public Folder resolveFolderEntity(User user, Long folderId) {
        if (folderId == null) return null;
        return folderRepository.findByIdAndUser(folderId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
    }
}
