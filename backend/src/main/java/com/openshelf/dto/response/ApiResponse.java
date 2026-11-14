package com.openshelf.dto.response;

import java.time.Instant;

public record ApiResponse<T>(boolean success, T data, Instant timestamp) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, Instant.now());
    }
}
