-- A composite FK prevents a progress row from pairing a file with the wrong book.
ALTER TABLE book_files ADD CONSTRAINT uq_book_files_book_id_id UNIQUE (book_id, id);

CREATE TABLE reading_progress (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    book_file_id UUID NOT NULL,
    current_page INTEGER NOT NULL CHECK (current_page > 0),
    furthest_page INTEGER NOT NULL CHECK (furthest_page >= current_page),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_reading_progress_user_file UNIQUE (user_id, book_file_id),
    CONSTRAINT fk_reading_progress_book_file FOREIGN KEY (book_id, book_file_id)
        REFERENCES book_files(book_id, id) ON DELETE CASCADE
);
CREATE INDEX ix_reading_progress_recent ON reading_progress(user_id, last_read_at DESC, id DESC);
CREATE INDEX ix_reading_progress_book_file ON reading_progress(book_id, book_file_id);
