package com.openshelf.storage;

import com.openshelf.exception.BookException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class LocalStorageService implements StorageService {
    private final Path root;

    public LocalStorageService(@Value("${openshelf.storage.root}") String configuredRoot) {
        Path configured = Path.of(configuredRoot).normalize();
        if (!configured.isAbsolute()) throw new IllegalArgumentException("openshelf.storage.root must be absolute");
        try {
            Files.createDirectories(configured);
            if (Files.isSymbolicLink(configured)) throw new IOException("Storage root must not be a symlink");
            root = configured.toRealPath();
        } catch (IOException exception) { throw BookException.storage(); }
    }

    @Override
    public StoredFile store(InputStream input, long maxBytes) {
        String key = UUID.randomUUID() + ".pdf";
        Path target = resolve(key);
        boolean created = false;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long size = 0;
            // CREATE_NEW makes collisions fail; partial files never overwrite an existing book.
            try (var output = Files.newOutputStream(target, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                created = true;
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    size += count;
                    if (size > maxBytes) throw BookException.tooLarge();
                    digest.update(buffer, 0, count);
                    output.write(buffer, 0, count);
                }
            }
            if (size == 0) throw BookException.invalidPdf();
            return new StoredFile(key, size, HexFormat.of().formatHex(digest.digest()));
        } catch (IOException | NoSuchAlgorithmException | RuntimeException exception) {
            if (created) {
                try { Files.deleteIfExists(target); }
                catch (IOException cleanup) { exception.addSuppressed(cleanup); }
            }
            if (exception instanceof BookException book) throw book;
            throw BookException.storage();
        }
    }

    @Override
    public Resource load(String key) {
        Path path = resolve(key);
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || !Files.isReadable(path)) throw BookException.notFound();
        return new FileSystemResource(path);
    }

    @Override
    public void delete(String key) {
        try { Files.deleteIfExists(resolve(key)); }
        catch (IOException exception) { throw BookException.storage(); }
    }

    private Path resolve(String key) {
        if (key == null || !key.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.pdf")) {
            throw BookException.notFound();
        }
        Path path = root.resolve(key).normalize();
        if (!path.getParent().equals(root) || Files.isSymbolicLink(path)) throw BookException.notFound();
        return path;
    }
}
