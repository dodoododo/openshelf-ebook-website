package com.openshelf.controller;

import com.openshelf.dto.request.BookUploadRequest;
import com.openshelf.dto.response.ApiResponse;
import com.openshelf.dto.response.BookResponse;
import com.openshelf.dto.response.PaginatedResponse;
import com.openshelf.security.OpenShelfPrincipal;
import com.openshelf.service.BookService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/books")
public class BookController {
    private final BookService books;
    public BookController(BookService books) { this.books = books; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<BookResponse>> upload(@AuthenticationPrincipal OpenShelfPrincipal user,
            @Valid @ModelAttribute BookUploadRequest metadata, @RequestParam("file") MultipartFile file) {
        var book = books.upload(user.getId(), metadata, file);
        return ResponseEntity.created(URI.create("/api/v1/books/" + book.id())).cacheControl(CacheControl.noStore()).body(ApiResponse.ok(book));
    }

    @GetMapping("/mine")
    public ResponseEntity<PaginatedResponse<BookResponse>> mine(@AuthenticationPrincipal OpenShelfPrincipal user,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(PaginatedResponse.of(books.mine(user.getId(), page, size)));
    }

    @GetMapping("/{bookId}")
    public ResponseEntity<ApiResponse<BookResponse>> get(@AuthenticationPrincipal OpenShelfPrincipal user, @PathVariable UUID bookId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.ok(books.get(user.getId(), bookId)));
    }

    @GetMapping("/{bookId}/file")
    public ResponseEntity<Resource> file(@AuthenticationPrincipal OpenShelfPrincipal user, @PathVariable UUID bookId) {
        // Spring MVC's Resource converter handles full, single/multiple ranges, suffixes, and 416.
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_PDF)
                .header("Content-Disposition", "inline; filename=\"book.pdf\"")
                .header("X-Content-Type-Options", "nosniff").body(books.file(user.getId(), bookId));
    }
}
