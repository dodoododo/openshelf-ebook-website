package com.openshelf.controller;

import com.openshelf.dto.request.UpdateReadingProgressRequest;
import com.openshelf.dto.response.ApiResponse;
import com.openshelf.dto.response.ContinueReadingResponse;
import com.openshelf.dto.response.PaginatedResponse;
import com.openshelf.dto.response.ReadingProgressResponse;
import com.openshelf.security.OpenShelfPrincipal;
import com.openshelf.service.ReadingProgressService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReadingProgressController {
    private final ReadingProgressService progress;
    public ReadingProgressController(ReadingProgressService progress) { this.progress = progress; }

    @GetMapping("/api/v1/books/{bookId}/progress")
    public ResponseEntity<ApiResponse<ReadingProgressResponse>> get(@AuthenticationPrincipal OpenShelfPrincipal user,
            @PathVariable UUID bookId, @RequestParam(required = false) UUID bookFileId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.ok(progress.get(user.getId(), bookId, bookFileId)));
    }

    @PutMapping("/api/v1/books/{bookId}/progress")
    public ResponseEntity<ApiResponse<ReadingProgressResponse>> update(@AuthenticationPrincipal OpenShelfPrincipal user,
            @PathVariable UUID bookId, @Valid @RequestBody UpdateReadingProgressRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.ok(progress.update(user.getId(), bookId, request)));
    }

    @GetMapping("/api/v1/library/continue-reading")
    public ResponseEntity<PaginatedResponse<ContinueReadingResponse>> recent(@AuthenticationPrincipal OpenShelfPrincipal user,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(PaginatedResponse.of(progress.recent(user.getId(), page, size)));
    }
}
