package com.magizhchi.box.repository;

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
public interface FolderRepository extends JpaRepository<Folder, Long> {

    Optional<Folder> findByIdAndUser(Long id, User user);

    // Root-level folders (parent IS NULL)
    List<Folder> findByUserAndParentIsNullOrderByNameAsc(User user);

    // Sub-folders of a given parent
    List<Folder> findByUserAndParentOrderByNameAsc(User user, Folder parent);

    // Duplicate-name checks
    boolean existsByUserAndNameAndParentIsNull(User user, String name);
    boolean existsByUserAndNameAndParent(User user, String name, Folder parent);

    // All folders in folder tree (for recursive delete/move)
    List<Folder> findByUserAndParent(User user, Folder parent);

    @Modifying
    @Query("DELETE FROM Folder f WHERE f.id IN :ids")
    void deleteAllByIds(@Param("ids") List<Long> ids);
}
