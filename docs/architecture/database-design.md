# OpenShelf — Preliminary Database Design

## 1. Overview & Strategy

OpenShelf relies on **PostgreSQL 17** for all relational and transactional metadata. File binaries (PDFs and generated cover images) are strictly separated from relational tables and stored in dedicated object storage.

Schema evolution is exclusively managed through **Flyway migration scripts** located in `src/main/resources/db/migration/`. Manual schema edits and automated JPA DDL mutations (`hibernate.ddl-auto=update` or `create`) are prohibited in all environments.

---

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
        uuid uploader_id FK
        varchar title
        varchar author
        text description
        varchar storage_key
        varchar file_hash
        bigint file_size_bytes
        integer page_count
        varchar cover_storage_key
        varchar status
        timestamptz created_at
        timestamptz updated_at
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
        numeric progress_percentage
        boolean is_finished
        timestamptz finished_at
        timestamptz last_read_at
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
  - `reading_progress (user_id, book_id)` must enforce uniqueness so each reader has exactly one active progress record per book.
  - `user_preferences (user_id)` enforces a single preference profile per user.
- **Search Optimization:**
  - `books (title, author)` with PostgreSQL `pg_trgm` or B-Tree indexes for fast auto-complete and catalog search.
- **Performance Indexes:**
  - `bookmarks (user_id, book_id, page_number)` for fast rendering of bookmark ribbons on the active reading page.
  - `highlights (user_id, book_id, page_number)` for loading only the annotations relevant to the visible page spread.
