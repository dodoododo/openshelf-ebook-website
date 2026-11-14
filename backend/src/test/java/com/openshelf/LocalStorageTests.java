package com.openshelf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.openshelf.exception.BookException;
import com.openshelf.storage.LocalStorageService;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalStorageTests {
    @TempDir Path root;
    @Test
    void generatedKeysAreRelativeUniqueAndDoNotOverwrite() throws Exception {
        var storage = new LocalStorageService(root.toString());
        var first = storage.store(new ByteArrayInputStream(new byte[] {1, 2}), 10);
        var second = storage.store(new ByteArrayInputStream(new byte[] {3}), 10);
        assertThat(first.key()).matches("[0-9a-f-]{36}\\.pdf").isNotEqualTo(second.key());
        assertThat(Files.readAllBytes(root.resolve(first.key()))).containsExactly((byte) 1, (byte) 2);
        assertThat(storage.load(first.key()).contentLength()).isEqualTo(2);
    }
    @Test
    void rejectsTraversalAbsoluteKeysAndRelativeRoot() {
        var storage = new LocalStorageService(root.toString());
        for (String key : new String[] {"../outside.pdf", "..\\outside.pdf", root.resolve("file.pdf").toString(), "file.pdf"}) {
            assertThatThrownBy(() -> storage.load(key)).isInstanceOf(BookException.class);
            assertThatThrownBy(() -> storage.delete(key)).isInstanceOf(BookException.class);
        }
        assertThatThrownBy(() -> new LocalStorageService("storage/books")).isInstanceOf(IllegalArgumentException.class);
    }
    @Test
    void removesPartialFilesOnOversizeEmptyAndBrokenStreams() throws Exception {
        var storage = new LocalStorageService(root.toString());
        assertThatThrownBy(() -> storage.store(new ByteArrayInputStream(new byte[5]), 4)).isInstanceOf(BookException.class);
        assertThatThrownBy(() -> storage.store(new ByteArrayInputStream(new byte[0]), 4)).isInstanceOf(BookException.class);
        InputStream broken = new InputStream() {
            int count;
            @Override public int read() throws IOException { if (++count > 2) throw new IOException("Interrupted"); return 42; }
        };
        assertThatThrownBy(() -> storage.store(broken, 100)).isInstanceOf(BookException.class);
        try (var paths = Files.list(root)) { assertThat(paths.count()).isZero(); }
    }
}
