package com.openshelf.dto.response;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(boolean success, ErrorBody error, Instant timestamp) {
    public record FieldIssue(String field, String issue) { }
    public record ErrorBody(String code, String message, int status, List<FieldIssue> details) { }

    public static ApiErrorResponse of(int status, String code, String message, List<FieldIssue> details) {
        return new ApiErrorResponse(false, new ErrorBody(code, message, status, details), Instant.now());
    }

    public static ApiErrorResponse of(int status, String code, String message) {
        return of(status, code, message, List.of());
    }
}
