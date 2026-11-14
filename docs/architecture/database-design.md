# OpenShelf — Database Design

> **Implementation status (2026-11-14):** `users` (V2), private `books`/`book_files` (V3), and `reading_progress` (V4) are implemented. Annotations, publication, and preferences remain preliminary. V1/V2/V3 are unchanged; Hibernate uses `validate`. Verification uses disposable PostgreSQL only. Normal startup applies pending forward migrations without resetting data. See [Milestone 3](../development/reading-progress-milestone-3.md).

## 1. Overview & Strategy

OpenShelf relies on **PostgreSQL 17** for all relational and transactional metadata. File binaries (PDFs and generated cover images) are strictly separated from relational tables and stored in dedicated object storage.

Schema evolution is exclusively managed through **Flyway migration scripts** located in `src/main/resources/db/migration/`. Manual schema edits and automated JPA DDL mutations (`hibernate.ddl-auto=update` or `create`) are prohibited in all environments.

### Implemented V3: private books and file versions

`V3__create_private_books.sql` introduces only:

- `books`: UUID primary key, `owner_id` foreign key to `users`, required trimmed title/author (maximum 200 characters), description (maximum 4,000, empty default), `visibility` defaulting to and constrained to `PRIVATE`, and UTC creation/update timestamps. The `(owner_id, created_at DESC, id DESC)` index supports ownership-scoped deterministic library pagination.
- `book_files`: UUID primary key, `book_id` foreign key with cascade metadata deletion, positive integer version, unique relative UUID `.pdf` storage key, sanitized original filename, server-determined `application/pdf` content type, positive size/page count, lowercase SHA-256, and UTC creation time. Unique `(book_id, version)` supports future immutable versions; only version 1 is created now.

The API exposes book/file IDs and integrity metadata, never storage keys or absolute paths. File IDs form the reader's immutable document-version key. Book and file metadata commit in one transaction after PDF validation; a failed transaction deletes the newly stored binary. Local disk and PostgreSQL are not a distributed transaction: abrupt termination or failed filesystem cleanup can require orphan reconciliation. No automatic file deletion is attached to direct SQL cascade deletes; there is no book deletion API in this milestone.

Database ownership comes exclusively from the session principal, not form input. Owner-scoped joins guard detail/file/list access; missing and foreign-owned books return the same 404. No role bypass exposes another user's private PDFs. See [API conventions](api-conventions.md#6-private-book-contracts-milestone-2).

---

### Implemented V4: private reading progress

`V4__create_reading_progress.sql` adds `reading_progress` with UUID identity, user/book/file references, positive `current_page`, `furthest_page >= current_page`, and UTC-compatible `TIMESTAMPTZ` timestamps. Unique `(user_id, book_file_id)` prevents duplicate first saves. The added unique `book_files(book_id, id)` key supports a composite foreign key from progress; user/book/file deletion cascades metadata. Page-count upper bounds and current ownership are checked in the service against trusted latest-file metadata.

Indexes `(user_id, last_read_at DESC, id DESC)` and `(book_id, book_file_id)` support recent reading and foreign-key operations. A single PostgreSQL upsert uses `GREATEST` to retain the largest **successfully reported** page during concurrent updates. `current_page` may move backward; percentage is calculated from current page and file page count, not stored. No finished flag or analytics exists.

Progress is tied to immutable `book_files.id`. A future replacement starts fresh; old progress is retained but excluded from Continue Reading. Stale file IDs receive 409. There is no replacement API yet. The recent query uses ownership-scoped to-one fetch joins, explicit count pagination, and latest-version filtering, avoiding N+1 reads. V3-to-V4 upgrade tests preserve existing book/file IDs and applied checksums.

## 2. Preliminary Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ BOOKS : "uploads"
    USERS ||--o{ READING_PROGRESS : "tracks"
    USERS ||--o{ BOOKMARKS : "creates"
    USERS ||--o{ HIGHLIGHTS : "creates"
    USERS ||--o{ NOTES : "writes"
    USERS ||--o{ USER_PREFERENCES : "configures"

    BOOKS ||--o{ READING_PROGRESS : "records"
    BOOK_FILES ||--o{ READING_PROGRESS : "anchors"
    BOOKS ||--o{ BOOK_FILES : "versions"
    BOOKS ||--o{ BOOKMARKS : "contains"
    BOOKS ||--o{ HIGHLIGHTS : "contains"
    BOOKS ||--o{ PUBLICATION_REQUESTS : "undergoes"

    BOOKMARKS }o--|| BOOKMARK_GROUPS : "categorized_by"
    HIGHLIGHTS ||--o{ NOTES : "annotates"

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar display_name
        varchar role
        timestamptz created_at
        timestamptz updated_at
    }

    BOOKS {
        uuid id PK
        uuid owner_id FK
        varchar title
        varchar author
        text description
        varchar visibility
        timestamptz created_at
        timestamptz updated_at
    }

    BOOK_FILES {
        uuid id PK
        uuid book_id FK
        integer version
        varchar storage_key UK
        varchar original_filename
        varchar content_type
        bigint size_bytes
        varchar sha256
        integer page_count
        timestamptz created_at
    }

    PUBLICATION_REQUESTS {
        uuid id PK
        uuid book_id FK
        uuid requester_id FK
        uuid reviewer_id FK
        varchar status
        text reviewer_notes
        timestamptz reviewed_at
        timestamptz created_at
    }

    READING_PROGRESS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        integer current_page
        uuid book_file_id FK
        integer furthest_page
        timestamptz last_read_at
        timestamptz created_at
        timestamptz updated_at
    }

    BOOKMARKS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        uuid group_id FK
        integer page_number
        varchar title
        varchar color_hex
        timestamptz created_at
    }

    BOOKMARK_GROUPS {
        uuid id PK
        uuid user_id FK
        varchar name
        varchar color_hex
        integer sort_order
    }

    HIGHLIGHTS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        integer page_number
        text selected_text
        jsonb position_coordinates
        varchar color_hex
        timestamptz created_at
    }

    NOTES {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        uuid highlight_id FK
        integer page_number
        text note_content
        timestamptz created_at
        timestamptz updated_at
    }

    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK
        varchar theme
        varchar reader_mode
        varchar scroll_direction
        numeric default_zoom
        timestamptz updated_at
    }
```

---

## 3. Data Storage Responsibility Matrix

| Data Item | Storage Engine | Access Control Mechanism |
| :--- | :--- | :--- |
| User Credentials & Roles | PostgreSQL (`users`) | Spring Security Authentication |
| Book Relational Metadata | PostgreSQL (`books`) | Privacy status check (`PRIVATE` vs `PUBLIC`) |
| PDF Document Binaries | Object Storage (Local FS / S3) | Streamed via authenticated backend endpoint or signed URLs |
| Book Cover Images | Object Storage (Local FS / S3) | Public or authenticated endpoint |
| User Reading Progress | PostgreSQL (`reading_progress`) | Strict user ownership: `user_id = auth.user_id` |
| Bookmarks & Annotations | PostgreSQL (`bookmarks`, `notes`) | Strict user ownership: `user_id = auth.user_id` |
| Coordinates / Text Ranges | PostgreSQL JSONB (`highlights`) | Strict user ownership: `user_id = auth.user_id` |

---

## 4. Key Indexing & Query Considerations

- **Unique Compound Keys:**
  - `reading_progress (user_id, book_file_id)` enforces one progress record per user and immutable PDF version; a composite book/file foreign key ensures the file belongs to the book.
  - `user_preferences (user_id)` enforces a single preference profile per user.
- **Search Optimization:**
  - `books (title, author)` with PostgreSQL `pg_trgm` or B-Tree indexes for fast auto-complete and catalog search.
- **Performance Indexes:**
  - `bookmarks (user_id, book_id, page_number)` for fast rendering of bookmark ribbons on the active reading page.
  - `highlights (user_id, book_id, page_number)` for loading only the annotations relevant to the visible page spread.
