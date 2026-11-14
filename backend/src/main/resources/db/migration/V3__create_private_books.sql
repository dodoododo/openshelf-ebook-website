CREATE TABLE books (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
    author VARCHAR(200) NOT NULL CHECK (char_length(btrim(author)) BETWEEN 1 AND 200),
    description VARCHAR(4000) NOT NULL DEFAULT '',
    visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE' CHECK (visibility = 'PRIVATE'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_books_owner_created ON books(owner_id, created_at DESC, id DESC);

CREATE TABLE book_files (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    storage_key VARCHAR(40) NOT NULL UNIQUE CHECK (storage_key ~ '^[0-9a-f-]{36}\.pdf$'),
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL CHECK (content_type = 'application/pdf'),
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    sha256 VARCHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    page_count INTEGER NOT NULL CHECK (page_count > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_book_files_version UNIQUE (book_id, version)
);
