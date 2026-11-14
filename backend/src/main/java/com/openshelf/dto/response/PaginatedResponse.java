package com.openshelf.dto.response;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;

public record PaginatedResponse<T>(boolean success, List<T> data, Pagination pagination, Instant timestamp) {
    public record Pagination(int page, int size, long totalElements, int totalPages, boolean isLast) { }
    public static <T> PaginatedResponse<T> of(Page<T> page) {
        return new PaginatedResponse<>(true, page.getContent(), new Pagination(page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast()), Instant.now());
    }
}
