package com.openshelf.entity;

import com.openshelf.storage.StoredFile;
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
@Table(name = "book_files")
public class BookFile {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false) private Book book;
    @Column(nullable = false) private int version;
    @Column(name = "storage_key", nullable = false, length = 40, unique = true) private String storageKey;
    @Column(name = "original_filename", nullable = false, length = 255) private String originalFilename;
    @Column(name = "content_type", nullable = false, length = 100) private String contentType;
    @Column(name = "size_bytes", nullable = false) private long sizeBytes;
    @Column(nullable = false, length = 64) private String sha256;
    @Column(name = "page_count", nullable = false) private int pageCount;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected BookFile() { }
    public BookFile(Book book, StoredFile stored, String filename, int pages, Instant now) {
        id = UUID.randomUUID(); this.book = book; version = 1; storageKey = stored.key(); originalFilename = filename;
        contentType = "application/pdf"; sizeBytes = stored.sizeBytes(); sha256 = stored.sha256(); pageCount = pages; createdAt = now;
    }
    public UUID getId() { return id; }
    public Book getBook() { return book; }
    public int getVersion() { return version; }
    public String getStorageKey() { return storageKey; }
    public String getOriginalFilename() { return originalFilename; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public String getSha256() { return sha256; }
    public int getPageCount() { return pageCount; }
    public Instant getCreatedAt() { return createdAt; }
}
