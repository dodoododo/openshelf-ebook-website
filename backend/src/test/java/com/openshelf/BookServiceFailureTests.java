package com.openshelf;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.openshelf.dto.request.BookUploadRequest;
import com.openshelf.entity.Book;
import com.openshelf.entity.BookFile;
import com.openshelf.exception.BookException;
import com.openshelf.repository.BookFileRepository;
import com.openshelf.repository.BookRepository;
import com.openshelf.service.BookService;
import com.openshelf.storage.StorageService;
import com.openshelf.storage.StoredFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.TransactionSystemException;

class BookServiceFailureTests {
    private final StorageService storage = mock(StorageService.class);
    private final BookRepository books = mock(BookRepository.class);
    private final BookFileRepository files = mock(BookFileRepository.class);
    private final PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
    private final BookService service = new BookService(books, files, storage, manager, Clock.systemUTC(), 31457280);
    private final BookUploadRequest metadata = new BookUploadRequest("Test", "Author", "");

    private MockMultipartFile pdf() throws Exception {
        return new MockMultipartFile("file", "test.pdf", "application/pdf", Files.readAllBytes(Path.of("../frontend/public/sample.pdf")));
    }

    @Test
    void commitFailureDeletesTheAlreadyWrittenBinary() throws Exception {
        var file = pdf();
        var stored = new StoredFile(UUID.randomUUID()+".pdf", file.getSize(), "0".repeat(64));
        when(storage.store(any(), anyLong())).thenReturn(stored);
        when(storage.load(stored.key())).thenReturn(new ByteArrayResource(file.getBytes()));
        when(books.saveAndFlush(any(Book.class))).thenAnswer(call -> call.getArgument(0));
        when(files.saveAndFlush(any(BookFile.class))).thenAnswer(call -> call.getArgument(0));
        when(manager.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        doThrow(new TransactionSystemException("Simulated commit failure")).when(manager).commit(any());
        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), metadata, file)).isInstanceOf(TransactionSystemException.class);
        verify(storage).delete(stored.key());
    }

    @Test
    void storageFailureDoesNotCreateMetadata() throws Exception {
        when(storage.store(any(), anyLong())).thenThrow(BookException.storage());
        var file = pdf();
        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), metadata, file)).isInstanceOf(BookException.class);
        verifyNoInteractions(books, files, manager);
    }
}
