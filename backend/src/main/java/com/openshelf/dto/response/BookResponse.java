package com.openshelf.dto.response;

import java.time.Instant;
import java.util.UUID;

public record BookResponse(UUID id, String title, String author, String description, String visibility,
        Instant createdAt, Instant updatedAt, FileResponse file) {
    public record FileResponse(UUID id, int version, String originalFilename, String contentType,
            long sizeBytes, String sha256, int pageCount, Instant createdAt) { }
}
