# Milestone 2 — Private PDF Upload & Book Storage

Implemented 2026-11-13. This is the explicitly authorized private-book backend slice following the verified reader prototype. Traditional backend layers and frontend folder-by-type structure are preserved. No commit or push.

## Working flow and scope

Sign in → **My Library → Upload PDF** → enter title/author and optional description → upload → the real library refreshes → **Read** opens the existing PDF Reader. Refreshing reloads the private file and browser-local page position. Logging out revokes subsequent file requests; a second account cannot list, inspect, or stream the first account's book. The original CC0 `/read/sample` remains a demo, separate from uploaded books.

Book/file metadata is PostgreSQL-backed. Reading progress is **still browser-only**, keyed by user ID, book ID, and immutable file ID, with the previous memory fallback on storage denial. There is no reading_progress, annotation, highlight, bookmark, or note table. Public publishing, moderation, reviews, EPUB, S3, book editing/deletion, and new authentication mechanisms were not added.

## Database and failure handling

Forward migration `V3__create_private_books.sql` creates `books` and `book_files`. V1/V2 are byte-identical to the earlier milestones. `books.owner_id` references users; visibility defaults to and is constrained to PRIVATE. A deterministic owner/creation/ID index supports pagination. `book_files` holds the initial version 1, unique `(book_id, version)` and storage key, sanitized original filename, PDF content type, actual byte size, SHA-256, page count, and creation time. File UUIDs support future version-specific reading state. The [database design](../architecture/database-design.md) records constraints and future-only tables.

`BookService` stores a bounded binary, validates its contents, then uses a transaction template to commit both metadata rows. The template returns after commit; validation, flush, or commit failure triggers binary deletion. Storage deletes partial writes after stream failure or excessive bytes. A killed process or filesystem deletion failure can leave an orphan: local disk/PostgreSQL are not a distributed transaction and no reconciliation job is implemented. There is no direct-SQL cascade-to-filesystem deletion mechanism.

## Storage and environment configuration

`StorageService` exposes store/load/delete through relative keys and Spring Resource values; the service layer does not depend on a local absolute file path. `LocalStorageService` is the only implementation. It accepts an **absolute** storage root, creates it once, resolves its real path, and rejects relative roots, traversal, absolute keys, malformed UUID keys, and symlink file targets. Files use server-generated UUID `.pdf` names with CREATE_NEW, so client names never become paths and collisions cannot overwrite a file. The server must exclusively control this directory and its filesystem permissions; application authorization is not protection from a host administrator or another process with disk access.

Defaults in `application.yml`:

- `OPENSHELF_STORAGE_ROOT`: JVM `${user.home}/.openshelf/storage/books` when unset. On Windows this is normally `C:/Users/<service-user>/.openshelf/storage/books`. It is independent of the launch directory. An override such as `D:/OpenShelf/storage/books` must be absolute and outside all web/static roots. Use a persistent writable disk and retain the same root/service account across restarts.
- `OPENSHELF_UPLOAD_MAX_BYTES=31457280`: authoritative service limit, 30 MiB.
- `OPENSHELF_UPLOAD_MAX_FILE_SIZE=30MB`: servlet per-file limit (Spring's binary size unit).
- `OPENSHELF_UPLOAD_MAX_REQUEST_SIZE=31MB`: entire multipart request limit, allowing metadata overhead.
- Frontend `VITE_UPLOAD_MAX_BYTES=31457280`: advisory picker limit. Keep it aligned when changing backend limits. The server always rechecks actual bytes and never trusts client size or Content-Type.

The normal `scripts/run-backend.ps1` allowlist now loads the four backend variables from the existing ignored root `.env`; `.env.example` documents defaults. Frontend `.env.example` documents its advisory limit. No actual `.env` was changed. To launch normally, use the existing backend helper and `npm.cmd run dev` in `frontend/`; normal startup applies pending migrations, without resetting the database.

The default private root is outside the repository. `/storage/` and `/backend/storage/` are ignored for optional repository-local development roots. These anchored patterns intentionally do **not** ignore the Java `storage/` source package. Uploaded binaries must never be added to Git or placed in `frontend/public/`. The existing public CC0 sample is unchanged.

## Validation and access control

- Existing session authentication, fixation protection, CSRF bootstrap/renewal, and authorization filters remain intact. Every book route requires authentication. Multipart POST uses the existing X-CSRF-TOKEN header; the browser supplies its multipart boundary.
- The backend derives the owner from the trusted principal. Owner/visibility/version/storage fields in form data cannot modify the DTO or entity identity. All new books are PRIVATE, regardless of form input.
- The server rejects empty/oversized files, wrong extensions, missing PDF signatures, malformed/unsupported PDFs, and encrypted documents (including empty-password encryption). Client MIME is ignored. Original filenames are reduced to a bounded display basename and control characters are replaced.
- [Apache PDFBox 3.0.8](https://pdfbox.apache.org/download.html) performs strict structural parsing with temporary stream-cache support, extracts page count, and visits the page tree. PDF input buffering is bounded by the configured file limit; concurrent parser work has no additional worker pool, timeout, or decompressed-content quota. Parsing does **not** certify that a PDF is malware-free. There is no antivirus/content-disarm service in this milestone.
- Repository queries join books to the session owner for list/detail/file lookup. Missing and foreign-owned resources return the same 404; admins have no private-book bypass. Responses exclude storage keys, absolute paths, and credentials.
- The PDF endpoint returns a nonpublic Resource only after ownership checks, with no-store, application/pdf, a fixed safe inline filename, and nosniff. [Spring MVC's range converter](https://docs.spring.io/spring/reference/web/webmvc/mvc-range.html) supplies 200/206/416 and range headers; owner checks precede conversion. PDF.js uses credentials for full/range requests. Already downloaded pixels or bytes cannot be revoked from browser memory, but logout denies subsequent server access.

## API contracts

- `POST /api/v1/books`: multipart `file`, `title` (1–200), `author` (1–200), optional `description` (maximum 4,000). Returns 201, Location, `ApiResponse<BookResponse>`.
- `GET /api/v1/books/mine?page=0&size=20`: owner-only, size 1–50, newest-first deterministic pagination. Returns data array plus page/size/totalElements/totalPages/isLast.
- `GET /api/v1/books/{uuid}`: owner-only metadata envelope.
- `GET /api/v1/books/{uuid}/file`: owner-only PDF with full and byte-range support.

`BookResponse`: id, title, author, description, visibility, createdAt, updatedAt, and file metadata. `file`: id, version, originalFilename, contentType, sizeBytes, sha256, pageCount, createdAt. The frontend derives the trusted file endpoint itself and maps the file ID to the existing reader document-version contract. No public URL/storage key is returned. Errors follow the existing JSON envelope: metadata/invalid PDF 400, anonymous 401, CSRF 403, unavailable/not-owned 404, excessive upload 413, storage unavailable 503, and generic database failure 500. Range 416 uses protocol headers. See [API conventions](../architecture/api-conventions.md#6-private-book-contracts-milestone-2).

## Verification

- Backend: final `powershell -ExecutionPolicy Bypass -File scripts/test-backend.ps1` — **34 passed**, zero failures/errors/skips, BUILD SUCCESS, 1:13. All database writes use disposable PostgreSQL 17 Testcontainers, not the development database. Coverage includes valid upload/metadata/integrity, real servlet multipart 413, wrong type/signature, malformed/empty/encrypted/oversized input, CSRF/auth, owner/PRIVATE assignment, traversal keys, independent non-overwriting writes, partial-stream cleanup, database flush and transaction commit cleanup, user isolation, identifiers/pagination, full/suffix/partial/unsatisfiable delivery, V2→V3 data/checksum preservation, and all existing auth tests.
- An intermediate 34-test run failed only because the new migration assertion counted Flyway's versionless schema-creation row; it now compares versioned migrations. The final run above passed. Existing Maven metadata-feed 401 and JVM/Mockito warnings remain non-failing.
- Frontend: `npm.cmd test` — **43 passed**; `npm.cmd run test:types`, `npm.cmd run lint`, `npm.cmd run build` all passed. Lint has no warnings. Vite retains its size advisory: shared JS 519.95 kB, separate lazy reader 458.18 kB and local worker 1,271.91 kB. No unrelated bundle refactoring was added.
- Full Edge browser suite: `npm.cmd run test:e2e -- --workers=2` — **24 passed in 2.5 minutes**. All prior authentication, layout, and sample-reader assertions remain; presentation fixtures now supply an empty real-library response instead of leaking into live authentication. The former sample-only service assertion now verifies that non-sample IDs use the real API. New checks cover validation, successful multipart upload, library refresh, real PDF rendering/page restoration, owner range bytes, logout denial, second-user library/metadata/file denial, and mobile upload failures retaining fields.
- PowerShell AST syntax validation passed for the updated normal backend launch helper. Git ignore checks confirm private data roots are ignored while Java storage source and the public licensed sample remain trackable.

- Production preview: all six sample-reader tests passed against built assets. The dedicated production upload run (`OPENSHELF_VERIFY_RESTART=1`, `tests/e2e/upload.spec.ts`, one worker) passed **2/2 in 52.2 seconds**. It stopped child JVM PID 12348 and started PID 30624 against the same PostgreSQL container and private storage root. The first user's book, immutable file ID, PDF access, and browser-local page 2 restoration survived; sessions were lost and reauthentication was required. Logout again denied file access.
- The initial combined production/restart run passed its six reader tests and mobile upload test, but restart acknowledgement timed out because the disposable PostgreSQL connection failed. The test-only launcher now uses explicit `127.0.0.1`, disabled local test SSL negotiation, and bounded connection timeouts. Its final dedicated restart run above passed. This does not change normal application datasource/security behavior. Milestone completion is based on the successful real process-restart run, not the earlier failed attempt.
- V1 SHA-256 remains `E9D27011048DE4F32A899903BCC38BC6EA96093D16A97756D7E545F317247498`; V2 remains `3786A15A001CEE29E3EA666955E9EE25CDCE3E5C42D6FFCDA076CA372F0ADA2D`. `git diff --check` passed. The public sample remains unchanged. No development database reset, migration repair/baseline, commit, or push was performed.
- SHA-256 comparison also confirms seven frontend authentication/service/provider/context/route-guard files unchanged, as well as the CC0 sample binary. The Spring Security filter chain and authentication implementation were not modified.

## Visual verification

Captured from the successful production preview run and visually inspected. Screenshots contain synthetic test metadata and the original CC0 sample, not a user's private document.

- [Private library](screenshots/private-library.png)
- [Uploaded PDF in the existing reader](screenshots/private-reader.png)
- [Mobile upload validation/error](screenshots/private-upload-mobile.png)

## Reproducing the isolated browser and restart checks

With Docker Desktop running, from `backend/` launch:

```powershell
.\mvnw.cmd test-compile spring-boot:test-run "-Dspring-boot.run.main-class=com.openshelf.BrowserTestApplication"
```

The test-only parent owns a disposable database, a temporary private storage directory, and a child backend JVM at port 18080. No database credentials enter tracked files. Java's temporary classpath argument file contains no credentials. The harness can stop/start **the actual child JVM**, retaining the same database and storage, via ignored `backend/target/browser-control/restart.request`; acknowledgement is `restart.ready`. There is no restart HTTP endpoint or production restart capability. Stopping the parent stops the child and disposable database. Run it from `backend/`; its control markers are test artifacts. Avoid `mvn clean` while using the browser harness because it removes its classpath/control artifacts.

From `frontend/`, the full suite starts Vite on port 5174 with its API proxy targeting 18080. For the dedicated serial restart check, start with a fresh/restarted test backend (to reset credential-throttle counters), then:

```powershell
$env:OPENSHELF_VERIFY_RESTART = '1'
npm.cmd run test:e2e -- tests/e2e/upload.spec.ts --workers=1
```

The test creates two real users and checks isolation, restarts the backend JVM, confirms sessions are lost, signs in again, finds the same persisted book/file ID, and resumes the same real PDF. Use a production preview at port 5174 with `OPENSHELF_API_PROXY_TARGET=http://127.0.0.1:18080` and the same test command to verify built assets. The restart option must be serial and run separately from the full parallel suite.

## Task file inventory

- Backend dependency/configuration: `backend/pom.xml`, `backend/src/main/resources/application.yml`, `.env.example`, `.gitignore`, `scripts/run-backend.ps1`.
- Schema/entities/repositories: `V3__create_private_books.sql`, `entity/Book.java`, `entity/BookFile.java`, `repository/BookRepository.java`, `repository/BookFileRepository.java`.
- HTTP/service/contracts: `controller/BookController.java`, `service/BookService.java`, `dto/request/BookUploadRequest.java`, `dto/response/BookResponse.java`, `dto/response/PaginatedResponse.java`, `mapper/BookMapper.java`, `exception/BookException.java`, existing `GlobalExceptionHandler.java`.
- Binary storage: `storage/StorageService.java`, `LocalStorageService.java`, `StoredFile.java`.
- Backend tests: `BookIntegrationTests.java`, `BookServiceFailureTests.java`, `LocalStorageTests.java`; updated `MigrationTests.java`, `PostgresIntegrationTest.java`, and isolated `BrowserTestApplication.java`.
- Frontend: `.env.example`, `types/book.ts`, `services/bookService.ts`, `utils/bookValidation.ts`, `components/books/BookUploadForm.tsx`, `pages/LibraryPage.tsx`, route registration, reader data badge, and PDF credential/session-error handling in `usePdfDocument.ts`. Existing renderer/toolbar/canvas components remain unchanged.
- Frontend verification: `tests/upload.test.tsx`, `tests/bookService.test.ts`, `tests/e2e/upload.spec.ts`; adjusted sample service assertion and presentation fixtures in existing tests.
- Documentation: README, this report, current-state, roadmap, database/API/system design, reader spec, design-system notes, and synthetic test screenshots.

Prior uncommitted changes are preserved. The inventory describes this milestone, not the repository's entire dirty worktree.

## Next milestone

**Milestone 3: Database-backed Private Reading Progress & Continue Reading.** Define the owner/book/file-version persistence contract, automatic save/restore and conflict behavior, and a real Continue Reading list. Keep it separate from highlights, annotations, public publication, and moderation.
