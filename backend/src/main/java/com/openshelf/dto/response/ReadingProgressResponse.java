package com.openshelf.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ReadingProgressResponse(UUID bookId, UUID bookFileId, int fileVersion, int currentPage,
        int furthestPage, int totalPages, double progressPercentage, Instant lastReadAt, Instant createdAt, Instant updatedAt) { }
