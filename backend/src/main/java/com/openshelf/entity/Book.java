package com.openshelf.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "books")
public class Book {
    @Id private UUID id;
    @Column(name = "owner_id", nullable = false) private UUID ownerId;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, length = 200) private String author;
    @Column(nullable = false, length = 4000) private String description;
    @Column(nullable = false, length = 20) private String visibility;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected Book() { }
    public Book(UUID ownerId, String title, String author, String description, Instant now) {
        this.id = UUID.randomUUID(); this.ownerId = ownerId; this.title = title; this.author = author;
        this.description = description; this.visibility = "PRIVATE"; this.createdAt = now; this.updatedAt = now;
    }
    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getDescription() { return description; }
    public String getVisibility() { return visibility; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
