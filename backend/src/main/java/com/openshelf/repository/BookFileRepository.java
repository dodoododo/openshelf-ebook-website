package com.openshelf.repository;

import com.openshelf.entity.BookFile;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BookFileRepository extends JpaRepository<BookFile, UUID> {
    @Query("select f from BookFile f join fetch f.book b where b.id = :bookId and b.ownerId = :ownerId order by f.version desc")
    java.util.List<BookFile> findOwned(UUID bookId, UUID ownerId, Pageable pageable);

    @Query(value = "select f from BookFile f join fetch f.book b where b.ownerId = :ownerId and f.version = (select max(v.version) from BookFile v where v.book = b) order by b.createdAt desc, b.id desc",
            countQuery = "select count(b) from Book b where b.ownerId = :ownerId")
    Page<BookFile> findMine(UUID ownerId, Pageable pageable);
}
