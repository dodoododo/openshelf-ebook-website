package com.openshelf.service;

import com.openshelf.dto.request.BookUploadRequest;
import com.openshelf.dto.response.BookResponse;
import com.openshelf.entity.Book;
import com.openshelf.entity.BookFile;
import com.openshelf.exception.BookException;
import com.openshelf.mapper.BookMapper;
import com.openshelf.repository.BookFileRepository;
import com.openshelf.repository.BookRepository;
import com.openshelf.storage.StorageService;
import com.openshelf.storage.StoredFile;
import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.util.Locale;
import java.util.UUID;
import org.apache.pdfbox.pdfparser.PDFParser;
import org.apache.pdfbox.io.IOUtils;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class BookService {
    private final BookRepository books;
    private final BookFileRepository files;
    private final StorageService storage;
    private final TransactionTemplate transaction;
    private final Clock clock;
    private final long maxBytes;

    public BookService(BookRepository books, BookFileRepository files, StorageService storage,
            PlatformTransactionManager manager, Clock clock, @Value("${openshelf.upload.max-bytes}") long maxBytes) {
        this.books = books; this.files = files; this.storage = storage; this.clock = clock;
        this.transaction = new TransactionTemplate(manager); this.maxBytes = maxBytes;
        if (maxBytes < 1) throw new IllegalArgumentException("Upload limit must be positive");
    }

    public BookResponse upload(UUID owner, BookUploadRequest metadata, MultipartFile file) {
        String filename = safeFilename(file.getOriginalFilename());
        if (!filename.toLowerCase(Locale.ROOT).endsWith(".pdf") || file.isEmpty()) throw BookException.invalidPdf();
        if (file.getSize() > maxBytes) throw BookException.tooLarge();
        StoredFile stored = null;
        boolean committed = false;
        try {
            try (InputStream input = file.getInputStream()) { stored = storage.store(input, maxBytes); }
            StoredFile saved = stored;
            int pages = validatePdf(storage.load(stored.key()));
            // The template returns only after commit, so both flush and commit failures trigger file cleanup.
            BookResponse result = transaction.execute(status -> {
                var now = clock.instant();
                Book book = books.saveAndFlush(new Book(owner, metadata.title(), metadata.author(), metadata.description(), now));
                return BookMapper.response(files.saveAndFlush(new BookFile(book, saved, filename, pages, now)));
            });
            committed = true;
            return result;
        } catch (IOException exception) { throw BookException.storage(); }
        finally {
            if (!committed && stored != null) storage.delete(stored.key());
        }
    }

    private int validatePdf(Resource resource) {
        try (InputStream input = resource.getInputStream(); var buffer = new RandomAccessReadBuffer(input)) {
            byte[] header = new byte[5];
            buffer.readFully(header);
            buffer.seek(0);
            if (!java.util.Arrays.equals(header, "%PDF-".getBytes(java.nio.charset.StandardCharsets.US_ASCII))) throw BookException.invalidPdf();
            var parser = new PDFParser(buffer, "", null, null, IOUtils.createTempFileOnlyStreamCache());
            try (var document = parser.parse(false)) {
                if (document.isEncrypted() || document.getNumberOfPages() < 1) throw BookException.invalidPdf();
                // Visit the page tree to reject invalid page dictionaries, not just the header.
                for (var page : document.getPages()) {
                    if (page.getMediaBox().getWidth() <= 0 || page.getMediaBox().getHeight() <= 0) throw BookException.invalidPdf();
                }
                return document.getNumberOfPages();
            }
        } catch (IOException | IllegalArgumentException exception) { throw BookException.invalidPdf(); }
    }

    private String safeFilename(String original) {
        if (original == null) return "";
        String name = original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "_").strip();
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> mine(UUID owner, int page, int size) {
        if (page < 0 || size < 1 || size > 50) throw new BookException(400, "INVALID_PAGINATION", "Use page >= 0 and size between 1 and 50");
        return files.findMine(owner, PageRequest.of(page, size)).map(BookMapper::response);
    }

    @Transactional(readOnly = true)
    public BookResponse get(UUID owner, UUID id) { return BookMapper.response(owned(owner, id)); }

    @Transactional(readOnly = true)
    public Resource file(UUID owner, UUID id) { return storage.load(owned(owner, id).getStorageKey()); }

    private BookFile owned(UUID owner, UUID id) {
        return files.findOwned(id, owner, PageRequest.of(0, 1)).stream().findFirst().orElseThrow(BookException::notFound);
    }
}
