package com.openshelf.repository;

import com.openshelf.entity.ReadingProgress;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, UUID> {
    @Query("select p from ReadingProgress p join fetch p.bookFile f join fetch f.book b where p.userId = :userId and b.ownerId = :userId and p.bookId = :bookId and f.id = :fileId")
    Optional<ReadingProgress> findOwned(UUID userId, UUID bookId, UUID fileId);

    // One atomic statement handles both simultaneous first saves and monotonic furthest-page updates.
    @Modifying(clearAutomatically = true)
    @Query(value = """
        INSERT INTO reading_progress AS p (id, user_id, book_id, book_file_id, current_page, furthest_page)
        VALUES (:id, :userId, :bookId, :fileId, :page, :page)
        ON CONFLICT ON CONSTRAINT uq_reading_progress_user_file
        DO UPDATE SET current_page = EXCLUDED.current_page,
            furthest_page = GREATEST(p.furthest_page, EXCLUDED.furthest_page),
            last_read_at = clock_timestamp(), updated_at = clock_timestamp()
        """, nativeQuery = true)
    int upsert(UUID id, UUID userId, UUID bookId, UUID fileId, int page);

    @Query(value = "select p from ReadingProgress p join fetch p.bookFile f join fetch f.book b where p.userId = :userId and b.ownerId = :userId and f.version = (select max(v.version) from BookFile v where v.book = b) order by p.lastReadAt desc, p.id desc",
        countQuery = "select count(p) from ReadingProgress p join p.bookFile f join f.book b where p.userId = :userId and b.ownerId = :userId and f.version = (select max(v.version) from BookFile v where v.book = b)")
    Page<ReadingProgress> findRecent(UUID userId, Pageable pageable);
}
