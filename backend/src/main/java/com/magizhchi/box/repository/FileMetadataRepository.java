package com.magizhchi.box.repository;

import com.magizhchi.box.entity.FileMetadata;
import com.magizhchi.box.entity.Folder;
import com.magizhchi.box.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {

    // Folder-aware queries
    List<FileMetadata> findByUserAndFolderIsNullAndDeletedFalseOrderByUploadedAtDesc(User user);
    List<FileMetadata> findByUserAndFolderAndDeletedFalseOrderByUploadedAtDesc(User user, Folder folder);

    Optional<FileMetadata> findByIdAndUserAndDeletedFalse(Long id, User user);

    @Query("SELECT COALESCE(SUM(f.fileSizeBytes), 0) FROM FileMetadata f WHERE f.user = :user AND f.deleted = false")
    Long sumFileSizeByUser(User user);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE FileMetadata f SET f.folder = null WHERE f.folder.id IN :folderIds AND f.deleted = false")
    void detachFilesFromFolders(@Param("folderIds") List<Long> folderIds);
}
