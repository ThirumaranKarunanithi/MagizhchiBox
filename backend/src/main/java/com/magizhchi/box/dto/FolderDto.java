package com.magizhchi.box.dto;

import com.magizhchi.box.entity.Folder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FolderDto {
    private Long id;
    private String name;
    private Long parentId;
    private LocalDateTime createdAt;

    public static FolderDto from(Folder folder) {
        FolderDto dto = new FolderDto();
        dto.setId(folder.getId());
        dto.setName(folder.getName());
        dto.setParentId(folder.getParent() != null ? folder.getParent().getId() : null);
        dto.setCreatedAt(folder.getCreatedAt());
        return dto;
    }
}
