package com.magizhchi.box.service;

import com.magizhchi.box.dto.FolderDto;
import com.magizhchi.box.entity.Folder;
import com.magizhchi.box.entity.FileMetadata;
import com.magizhchi.box.entity.User;
import com.magizhchi.box.exception.ResourceNotFoundException;
import com.magizhchi.box.repository.FileMetadataRepository;
import com.magizhchi.box.repository.FolderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FolderService {

    private final FolderRepository folderRepository;
    private final FileMetadataRepository fileMetadataRepository;

    @Transactional
    public FolderDto createFolder(User user, String name, Long parentId) {
        Folder parent = null;
        if (parentId != null) {
            parent = folderRepository.findByIdAndUser(parentId, user)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent folder not found"));
        }

        // Duplicate name check at same level
        boolean exists = (parent == null)
                ? folderRepository.existsByUserAndNameAndParentIsNull(user, name)
                : folderRepository.existsByUserAndNameAndParent(user, name, parent);

        if (exists) {
            throw new IllegalArgumentException("A folder named \"" + name + "\" already exists here");
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

    @Transactional
    public void deleteFolder(User user, Long folderId) {
        Folder folder = folderRepository.findByIdAndUser(folderId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        // Move all files in this tree to root (null folder) so they aren't lost
        moveFilesInTreeToRoot(user, folder);
        folderRepository.delete(folder);
        log.info("Folder deleted: '{}' (id={}) for user {}", folder.getName(), folderId, user.getEmail());
    }

    /** Recursively un-parents every file in this folder and its sub-folders. */
    private void moveFilesInTreeToRoot(User user, Folder folder) {
        List<FileMetadata> files = fileMetadataRepository
                .findByUserAndFolderAndDeletedFalseOrderByUploadedAtDesc(user, folder);
        files.forEach(f -> f.setFolder(null));
        fileMetadataRepository.saveAll(files);

        folderRepository.findByUserAndParent(user, folder)
                .forEach(sub -> moveFilesInTreeToRoot(user, sub));
    }

    /** Resolve a Folder entity for use by FileService (null → root). */
    public Folder resolveFolderEntity(User user, Long folderId) {
        if (folderId == null) return null;
        return folderRepository.findByIdAndUser(folderId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
    }
}
