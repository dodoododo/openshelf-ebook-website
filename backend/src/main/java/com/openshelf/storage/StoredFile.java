package com.openshelf.storage;

public record StoredFile(String key, long sizeBytes, String sha256) { }
