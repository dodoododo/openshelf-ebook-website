package com.openshelf.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reading_progress")
public class ReadingProgress {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "book_id", nullable = false) private UUID bookId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_file_id", nullable = false) private BookFile bookFile;
    @Column(name = "current_page", nullable = false) private int currentPage;
    @Column(name = "furthest_page", nullable = false) private int furthestPage;
    @Column(name = "last_read_at", nullable = false) private Instant lastReadAt;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected ReadingProgress() { }
    public UUID getId() { return id; }
    public UUID getBookId() { return bookId; }
    public BookFile getBookFile() { return bookFile; }
    public int getCurrentPage() { return currentPage; }
    public int getFurthestPage() { return furthestPage; }
    public Instant getLastReadAt() { return lastReadAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
