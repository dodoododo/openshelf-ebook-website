package com.openshelf.mapper;

import com.openshelf.dto.response.BookResponse;
import com.openshelf.entity.BookFile;

public final class BookMapper {
    private BookMapper() { }
    public static BookResponse response(BookFile file) {
        var book = file.getBook();
        return new BookResponse(book.getId(), book.getTitle(), book.getAuthor(), book.getDescription(), book.getVisibility(),
                book.getCreatedAt(), book.getUpdatedAt(), new BookResponse.FileResponse(file.getId(), file.getVersion(),
                    file.getOriginalFilename(), file.getContentType(), file.getSizeBytes(), file.getSha256(),
                    file.getPageCount(), file.getCreatedAt()));
    }
}
