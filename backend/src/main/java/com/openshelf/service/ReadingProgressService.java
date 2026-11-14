package com.openshelf.service;

import com.openshelf.dto.request.UpdateReadingProgressRequest;
import com.openshelf.dto.response.ContinueReadingResponse;
import com.openshelf.dto.response.ReadingProgressResponse;
import com.openshelf.entity.BookFile;
import com.openshelf.exception.BookException;
import com.openshelf.mapper.ReadingProgressMapper;
import com.openshelf.repository.BookFileRepository;
import com.openshelf.repository.ReadingProgressRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReadingProgressService {
    private final BookFileRepository files;
    private final ReadingProgressRepository progress;

    public ReadingProgressService(BookFileRepository files, ReadingProgressRepository progress) {
        this.files = files;
        this.progress = progress;
    }

    @Transactional(readOnly = true)
    public ReadingProgressResponse get(UUID userId, UUID bookId, UUID expectedFileId) {
        BookFile file = currentFile(userId, bookId, expectedFileId);
        return progress.findOwned(userId, bookId, file.getId()).map(ReadingProgressMapper::response).orElse(null);
    }

    @Transactional
    public ReadingProgressResponse update(UUID userId, UUID bookId, UpdateReadingProgressRequest request) {
        BookFile file = currentFile(userId, bookId, request.bookFileId());
        if (request.currentPage() < 1 || request.currentPage() > file.getPageCount()) {
            throw new BookException(400, "INVALID_READING_PAGE", "Choose a page between 1 and " + file.getPageCount());
        }
        progress.upsert(UUID.randomUUID(), userId, bookId, file.getId(), request.currentPage());
        return ReadingProgressMapper.response(progress.findOwned(userId, bookId, file.getId()).orElseThrow());
    }

    @Transactional(readOnly = true)
    public Page<ContinueReadingResponse> recent(UUID userId, int page, int size) {
        if (page < 0 || size < 1 || size > 50) {
            throw new BookException(400, "INVALID_PAGINATION", "Use page >= 0 and size between 1 and 50");
        }
        // To-one fetch joins retrieve all card/progress data in one page query, plus the bounded count query.
        return progress.findRecent(userId, PageRequest.of(page, size)).map(ReadingProgressMapper::recent);
    }

    private BookFile currentFile(UUID userId, UUID bookId, UUID expectedFileId) {
        BookFile file = files.findOwned(bookId, userId, PageRequest.of(0, 1)).stream().findFirst().orElseThrow(BookException::notFound);
        if (expectedFileId != null && !expectedFileId.equals(file.getId())) {
            throw new BookException(409, "FILE_VERSION_CHANGED", "This PDF version has changed. Reopen the book before saving progress");
        }
        return file;
    }
}
