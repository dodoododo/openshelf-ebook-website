package com.openshelf.storage;

import java.io.InputStream;
import org.springframework.core.io.Resource;

public interface StorageService {
    StoredFile store(InputStream input, long maxBytes);
    Resource load(String key);
    void delete(String key);
}
