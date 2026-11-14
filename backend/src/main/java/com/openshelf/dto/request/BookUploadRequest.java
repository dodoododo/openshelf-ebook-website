package com.openshelf.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BookUploadRequest(@NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 200) String author, @Size(max = 4000) String description) {
    public BookUploadRequest {
        title = title == null ? null : title.strip();
        author = author == null ? null : author.strip();
        description = description == null ? "" : description.strip();
    }
}
