# Milestone 3 — Private Reading Progress & Continue Reading

Implemented 2026-11-14. This milestone extends the existing session-authenticated private upload/Reader path. It preserves layered backend packages, frontend folder-by-type organization, PDF.js rendering components, Authentication, CSRF, and private filesystem storage. No commit or push was made.

## Implemented journey

Upload a private PDF in My Library, open it, select a page, wait for **Saved · account progress**, refresh or leave and resume through Continue Reading. Progress is stored in PostgreSQL for the authenticated account and immutable PDF file ID. The original `/read/sample` remains an explicitly labelled browser-local demonstration. Uploaded PDFs have no local fallback or offline progress cache.

## Database and version policy

Only `V4__create_reading_progress.sql` is new. V1/V2/V3 remain byte-identical. It creates:

- UUID row identity and user/book foreign keys with metadata deletion cascades.
- A composite `(book_id, book_file_id)` foreign key referencing the added unique `(book_id, id)` key on `book_files`; a file cannot be attached to the wrong book in progress.
- Unique `(user_id, book_file_id)`, positive current page, and `furthest_page >= current_page` constraints.
- Database-generated UTC-compatible `TIMESTAMPTZ` activity/creation/update timestamps.
- Recent-reading `(user_id, last_read_at DESC, id DESC)` and book/file indexes.

Page upper bounds use trusted `BookFile.pageCount` in the service. Current page may move backward; furthest page is an atomic `GREATEST` of successfully reported pages. A native PostgreSQL `INSERT … ON CONFLICT` prevents duplicate simultaneous first saves and lost furthest-page updates. Percentage is derived from current page, rounded to two decimal places; it is not a stored completion flag. This follows PostgreSQL's [documented atomic upsert behavior](https://www.postgresql.org/docs/17/sql-insert.html).

The immutable `book_files.id` binds progress to a version. Future replacements start fresh, retain old records, and exclude old versions from Continue Reading. Stale GET/PUT file IDs receive 409. No file-replacement UI/API is implemented. Verification covers a synthetic version replacement in an isolated database.

## API contracts

All routes use the existing authenticated session and `Cache-Control: no-store`. User identity is derived from the principal; no body/query parameter assigns a user.

- `GET /api/v1/books/{bookId}/progress?bookFileId={fileId}` returns `ApiResponse<ReadingProgressResponse>`. A successful empty response is `data: null`. The optional file ID selects a consistency check against the latest file; the Reader always supplies it.
- `PUT /api/v1/books/{bookId}/progress` requires CSRF and JSON `{ "bookFileId": "uuid", "currentPage": 4 }`. The required file ID intentionally extends the illustrative page-only request to prevent stale writes against a replacement. Response data is the confirmed stored progress.
- `GET /api/v1/library/continue-reading?page=0&size=20` returns the existing paginated envelope with `data: [{ book, progress }]`. Page is zero-based, size is 1–50, and the UI requests six. Latest versions are sorted by `lastReadAt DESC, id DESC`; to-one fetch joins and a count query avoid N+1 loading.

Progress fields: `bookId`, `bookFileId`, `fileVersion`, `currentPage`, `furthestPage`, `totalPages`, `progressPercentage`, `lastReadAt`, `createdAt`, `updatedAt`. `book` is the existing private `BookResponse`, without paths or storage keys. Covers use an existing icon fallback.

Missing and foreign-owned resources produce the same 404 `BOOK_NOT_FOUND`. Bad bounds, DTOs, IDs or pagination produce 400; stale versions produce 409 `FILE_VERSION_CHANGED`. Existing 401 session and 403 CSRF behavior is preserved. See [full API conventions](../architecture/api-conventions.md#7-private-reading-progress-contracts-milestone-3).

## Reader save and restoration semantics

- Metadata and matching progress load before mounting `ReaderSession`. A saved record restores immediately without a redundant write. A new page-1 record is scheduled only after PDF readiness and matching actual/trusted page counts. Failed progress loading cannot overwrite page 1 or fall back to browser data.
- Canonical page is the last explicitly selected page. Page 4 remains page 4 in spread 3–4 and when switching modes, zooming or resizing. Spread turn buttons select the next/previous spread's leading page. The input and percentage show canonical page; a separate label shows the visible spread.
- A 1.5-second debounce coalesces rapid changes. A session-local queue permits one request in flight and saves the latest pending position afterward. Late responses confirm the queue without changing the displayed page. Unchanged positions and presentation-only changes produce no PUT.
- Visible states are Unsaved changes, Saving, Saved and Save failed. Saved requires a matching successful backend response or the initial confirmed GET. Failure stops repeated retries; manual Retry or a new navigation can try again. No credential or token is written to browser storage.
- My Library awaits a flush before leaving. A failed flush keeps the reader with Retry and an explicit leave-without-saving option. Unmount and visibility change attempt a flush; beforeunload warns while dirty. Browser Back and other unmounts do not await a blocking route guard. Tab closure, process termination and network loss cannot guarantee delivery; only confirmed positions are durable.
- Queue sends check the current account first. Late responses cannot recreate another account's private cache. Existing AuthProvider cancellation/removal clears reader and Continue Reading queries on login/account change, logout and detected expiry. Query keys contain the user ID; reader sessions include user/book/file identity.
- Across independent tabs/devices, the last database write wins for current page. Furthest page remains monotonic. No distributed ordering, optimistic locking or realtime subscription is claimed. Furthest page is the maximum successfully reported page; transient pages coalesced away during debounce are not reading analytics.
- Old private browser-local prototype positions are ignored rather than automatically migrated. Only the CC0 sample retains user/book/file-version-scoped local storage and its visible memory fallback.

## Continue Reading

The existing `LibraryPage` now contains Continue Reading above All your books. The existing `/library/continue-reading` navigation uses the same page and section, without creating a second library implementation. Cards show fallback artwork, title/author, current/total pages, percentage, last-read timestamp, file version and Resume Reading. Loading skeletons, empty state, error/retry, independent pagination and mobile/desktop layouts use existing Tailwind v4 tokens and shadcn Card/Button primitives.

Resume opens the normal Reader, which reloads matching authoritative progress. Last-page books stay in the list; Finished Books is outside scope.

## Actual file inventory

Backend additions under `backend/src/main/java/com/openshelf/`:

- `entity/ReadingProgress.java`
- `repository/ReadingProgressRepository.java`
- `service/ReadingProgressService.java`
- `controller/ReadingProgressController.java`
- `dto/request/UpdateReadingProgressRequest.java`
- `dto/response/ReadingProgressResponse.java`, `ContinueReadingResponse.java`
- `mapper/ReadingProgressMapper.java`

Also added `backend/src/main/resources/db/migration/V4__create_reading_progress.sql` and `backend/src/test/java/com/openshelf/ReadingProgressIntegrationTests.java`; updated `MigrationTests.java` and the test-only `BrowserTestApplication.java`. The browser harness raises only its disposable registration/login IP limits for multi-account regressions; production throttle/security configuration is unchanged.

Frontend additions under `frontend/src/`:

- `utils/readingProgressQueue.ts`
- `hooks/useReadingProgressSave.ts`
- `components/books/ContinueReadingSection.tsx`

Updated `pages/ReaderPage.tsx`, `pages/LibraryPage.tsx`, `routes/index.tsx`, `services/readingProgressService.ts`, `services/bookService.ts`, `types/readingProgress.ts`, and `types/book.ts`. Existing PDF document/page/spread/toolbar components and auth transport/provider/route guard remain unchanged.

Tests added: `frontend/tests/readingProgressQueue.test.ts`, `readingProgressSave.test.tsx`, `continueReading.test.tsx`, `e2e/progress.spec.ts`, and `e2e/progressSession.spec.ts`. Existing `e2e/layout.spec.ts`, `reader.spec.ts`, and `upload.spec.ts` now account for the real Continue Reading request, canonical counter semantics and confirmed saves before refresh.

Documentation updated: this report, `current-state.md`, `roadmap.md`, `database-design.md`, `api-conventions.md`, `system-design.md`, `reader-spec.md`, `design-system.md`, and `README.md`. Screenshots are listed below. User-provided `directory-tree.txt` and `project-files.txt` are preserved.

## Executed verification

- Backend required script: **42 tests passed**, zero failures/errors/skips, Maven BUILD SUCCESS in **2:13**. Coverage includes all existing auth/upload regressions, empty/create/update/backward/restore, duplicate/concurrent saves, monotonic furthest page, trusted bounds, anonymous/CSRF/owner denial, version mismatch, recent pagination/order, two SQL queries for a full recent page plus count, and database constraints.
- Flyway tests cover fresh V1–V4, managed upgrades from V1/V2, explicit V3–V4 upgrade retaining users/books/file IDs and all applied checksums, plus unmanaged-schema rejection. All DB work uses disposable Testcontainers PostgreSQL 17. Docker Desktop was initially stopped; the suite passed after starting it. No development database was used.
- Frontend: **56 tests passed** across 11 files. Application/test/config TypeScript checks, lint and production build passed. Queue tests cover serial/coalesced/backward writes, restored/new records, failure/manual retry, departure flush and explicit abandonment; hook tests verify account changes and late responses do not leak cache state. Continue Reading tests cover loading/empty/cards/pagination/error/retry.
- Full Edge browser suite: **30/30 passed in 2.5 minutes**, preserving all Authentication, upload, layout and CC0 reader regressions. New checks verify restore-before-save, no zoom/mode/resize PUTs, rapid coalescing, in-flight ordering, failed-save/manual retry, failed My Library departure retention, failed initial load without local fallback, session expiry, Continue Reading retry/pagination/resume and real private account switching. The actual database acceptance test verifies upload, page-4 save, confirmed response, refresh, Continue Reading, new browser context login and same-browser second-user GET/PUT/list denial.
- Production-built assets: **12/12 passed in 2.0 minutes** with one Edge worker: five progress presentation/failure tests, the real database/restart acceptance test, and all six existing sample-reader tests. The child backend JVM stopped at **PID 6268** and restarted at **PID 3924**, retaining the same PostgreSQL container and private storage directory. Sessions were lost; login again restored the identical confirmed page-4/file-version/timestamp progress response and authorized PDF access. This proves database persistence independently of localStorage and frontend caches.
- Final mobile acceptance extension: **1/1 passed in 34.5 seconds** against production preview, adding explicit checks for a real Continue Reading card and no horizontal overflow at 375px. The complete acceptance journey still passed. Screenshots below were taken from this final run and visually inspected.
- The first full browser run passed 29 tests and failed one new login-helper assertion: it assumed Account after every login, while the existing intended-destination redirect correctly returned to Library. The helper now checks successful login and explicitly visits Account when it needs that page. No authentication behavior was changed. The subsequent complete suite passed 30/30; retries remain disabled.
- SHA-256 checks confirm V1 `E9D27011048DE4F32A899903BCC38BC6EA96093D16A97756D7E545F317247498`, V2 `3786A15A001CEE29E3EA666955E9EE25CDCE3E5C42D6FFCDA076CA372F0ADA2D`, V3 `A436978F6573212568674E1D80C0474012AF2B6F5F0B3A0228A564041F103EE0`, and the CC0 sample `45A2E7E6510A91F5EDA7AB58D774576E772F2A5C8C271A66EC67EB89E67AB335` match the baseline. Git diff confirms existing backend security and frontend auth transport/provider/context/guard files unchanged. `git diff --check` passed.

## Visual evidence

All screenshots contain synthetic test metadata and the redistributable CC0 sample, with no user private document. The desktop card shows the actual PostgreSQL-backed page 4/5, 80%, activity time, version and Resume Reading. The mobile views retain readable content, visible controls and no horizontal overflow.

- [Desktop Continue Reading](screenshots/progress-continue-desktop.png)
- [Mobile account Reader](screenshots/progress-reader-mobile.png)
- [Mobile Continue Reading](screenshots/progress-continue-mobile.png)

## Reproduce locally

Docker Desktop must be running; JDK 21+ and Node/npm are required. From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-backend.ps1
cd frontend
npm.cmd test
npm.cmd exec tsc -- -b
npm.cmd exec tsc -- -p tsconfig.test.json --noEmit
npm.cmd run lint
npm.cmd run build
```

In a separate terminal from `backend/`, start the existing isolated browser harness:

```powershell
.\mvnw.cmd test-compile spring-boot:test-run "-Dspring-boot.run.main-class=com.openshelf.BrowserTestApplication"
```

It owns disposable PostgreSQL, a temporary storage directory and a child backend JVM on port 18080. Do not run Maven clean while it is alive. The test harness does not read `.env` or the normal private storage root. Then from `frontend/`:

```powershell
npm.cmd run test:e2e -- --workers=2
```

Playwright starts Vite on 5174 with its proxy pointed at the test backend. For a built-assets test, first start preview in a separate terminal with the same proxy target and reuse port 5174:

```powershell
$env:OPENSHELF_API_PROXY_TARGET = "http://127.0.0.1:18080"
npm.cmd run preview -- --host 127.0.0.1 --port 5174 --strictPort
```

Run the dedicated restart check separately with one worker; never restart during a parallel suite:

```powershell
$env:OPENSHELF_VERIFY_RESTART = "1"
npm.cmd run test:e2e -- tests/e2e/progressSession.spec.ts --workers=1
Remove-Item Env:OPENSHELF_VERIFY_RESTART
```

The executed 12-test production run used the same restart variable and `npm.cmd run test:e2e -- tests/e2e/progress.spec.ts tests/e2e/progressSession.spec.ts tests/e2e/reader.spec.ts --workers=1`. Preview was already serving the successful production build. The final additional mobile acceptance run used just `progressSession.spec.ts` without the restart variable.

The test uploads only the bundled CC0 PDF, saves page 4, refreshes, resumes, signs in from a fresh context, verifies a second account cannot read/write/list the progress, then requests an actual child JVM restart via ignored test-control markers. The same database and storage remain alive; sessions expire, and reauthentication must restore the identical confirmed progress record and PDF access.

For normal development, use the existing backend launch helper and `npm.cmd run dev`. Startup applies pending forward migrations normally. **Do not reset the database.**

## Limits and next milestone

Native tab-close delivery and offline durable queuing are not guaranteed. Concurrent independent sessions use last database write wins for current page. In-memory login sessions are lost on backend restart, while books/progress remain durable. Reopening an unchanged saved page does not update last-read activity until another position is saved. Offset pagination may shift while other sessions read. There are no cover extraction, Finished Books, analytics, annotations, notes, replacement management, publishing/moderation, S3 or EPUB features here.

The existing Vite shared-bundle size advisory remains (525.79 kB minified); the Reader and PDF worker remain separate assets. No cross-browser Safari/Firefox, deployed HTTPS or full screen-reader audit is claimed.

Recommended next milestone: **Private Bookmarks**, with user/book/immutable-file ownership, a minimal Reader panel and bookmark-to-page navigation, scoped and verified separately. Highlights, notes and public publishing can follow later.
