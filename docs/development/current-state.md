# OpenShelf — Current Engineering State

**Last Updated:** 2026-11-14 — Milestone 3 verified; Milestone 4 design proposed only

---

## 1. Current Development Phase
- **Completed Phases:** Phase 1 — Authentication & User Management; Phase 2 — UI/UX Design System & Application Layout
- **Workflow Strategy:** Frontend-First Development after Authentication
  - *Rationale:* User authentication establishes the identity foundation. Following authentication, all layouts, pages, interactive prototypes, and the Web PDF Reader will be built frontend-first using typed mock contracts before implementing backend business logic. This guarantees UI ergonomics and API expectation stability before database schemas are locked down.
- **Status:** Core Reading Milestones 1–3 implement the PDF Reader, private upload/storage, My Library, database-backed private reading progress and Continue Reading. Milestones 2/3 explicitly authorize these bounded backend business slices; wider catalog/shelf/annotation work remains incomplete.

---

## 2. Completed Work (Phase 0 Bootstrap)

### 2.1 Repository & Environment
- Established monorepo root structure with `frontend/`, `backend/`, `docs/`, `scripts/`, `.github/workflows/`.
- Configured `.gitignore` covering Windows, IDEs, build artifacts, and secrets. Fixed defect where `AGENTS.md` was inadvertently ignored.
- Generated `.env.example` and safe local `.env` with auto-generated credentials (excluded from git).
- Authored AI engineering governance guide (`AGENTS.md`) and project `README.md`.

### 2.2 Database Layer
- Configured `compose.yaml` with PostgreSQL 17 Alpine image (`postgres:17-alpine`), container name `openshelf-db`, persistent volume `openshelf_pgdata`, and container healthcheck.
- Verified container healthcheck and successful connection via `psql` executing database and user queries.

### 2.3 Backend (Spring Boot 4.1.2)
- Initialized Maven project targeting Java 21 LTS with Maven Wrapper (`mvnw.cmd`).
- Established the complete Layered Architecture package structure under `backend/src/main/java/com/openshelf/`:
  - `controller/`, `service/`, `repository/`, `entity/`, `dto/request/`, `dto/response/`, `mapper/`, `config/`, `security/`, `exception/`, `storage/`, `validation/`, `enums/`, `util/`.
  - Registered official `package-info.java` documentation for each architectural layer.
- Configured Spring Boot 4.1.2 parent with `spring-boot-starter-webmvc`, `spring-boot-starter-security`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-boot-starter-actuator`, `flyway-database-postgresql`, `postgresql`, and `spring-boot-devtools`.
- Created profile configurations: `application.yml`, `application-local.yml`, and `application-prod.yml`.
- Configured Spring Security 7 allowing unauthenticated access to `/actuator/health` while keeping application endpoints protected by default.
- Created initial Flyway baseline migration (`V1__init.sql`).
- Created PowerShell helper scripts `scripts/run-backend.ps1` and `scripts/test-backend.ps1` to safely load `.env` variables into process memory without leaking secrets.
- Executed `mvnw.cmd clean test` successfully (all 15 source files compiled with `--release 21`, 1 test run, 0 failures, 0 errors).

### 2.4 Frontend (React 19 + TypeScript + Vite + Tailwind CSS v4)
- Initialized React + TypeScript template with Vite.
- Configured Tailwind CSS v4 using the official `@tailwindcss/vite` plugin and `@/styles/globals.css`.
- Configured shadcn/ui foundation (`components.json`, `src/lib/utils.ts`, `Button`, `Card`).
- Implemented folder-by-type architecture (`components/`, `pages/`, `services/`, `hooks/`, `providers/`, `types/`, `routes/`, `styles/`).
- Set up central Axios client (`apiClient.ts`) and TanStack Query provider (`QueryProvider.tsx`).
- Configured Vite development proxy:
  - `/api` -> `http://localhost:8080`
  - `/actuator` -> `http://localhost:8080`
- Created interactive bootstrap page (`HomePage.tsx`) with real-time backend health check status.
- Executed `npm.cmd run build` successfully with strict TypeScript validation.

---

## 3. Historical Phase 0 Verification

The following records the earlier bootstrap verification. The latest review and its executed checks are recorded in section 5.

| Verification Item | Target | Result | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Container** | `127.0.0.1:5432` | **PASS** | Container `openshelf-db` healthy; query `SELECT current_database()` executed successfully |
| **Backend Test Suite** | Spring Boot 4.1.2 Context | **PASS** | `mvnw clean test` passed: 1 run, 0 failures |
| **Backend Startup** | `http://localhost:8080` | **PASS** | Application started; `ReadinessState changed to ACCEPTING_TRAFFIC` |
| **Direct Actuator Health** | `http://localhost:8080/actuator/health` | **PASS** | HTTP 200 returned `{"status":"UP"}` |
| **Frontend Production Build**| `npm run build` | **PASS** | Built in 421ms with zero TypeScript errors |
| **Frontend Dev Server** | `http://localhost:5173` | **PASS** | HTTP 200; rendered bootstrap shell |
| **Vite Actuator Proxy** | `http://localhost:5173/actuator/health` | **PASS** | Proxied to backend port 8080; returned `{"status":"UP"}` |
| **Git Secret Protection** | `.env` ignored | **PASS** | `git status --ignored` confirms `.env` is ignored |

---

## 4. Architectural Decisions & Realignment

1. **Workflow Sequence Decision:** The team approved a **Frontend-First workflow after Authentication**.
   - Sequence: Phase 1 (Auth) -> Phase 2 (Design System) -> Phase 3 (Frontend Pages & Prototypes) -> Phase 4 (Backend Business Core) -> Phase 5 (API Integration).
   - Rationale: Completing auth first provides true user sessions. Building the UI next ensures optimal reading ergonomics, validated contracts, and responsive layout testing with a real sample PDF before backend schemas and APIs are finalized.
2. **Replaceable Service Layer Strategy:** All Phase 3 frontend pages will interact with a typed service layer that returns mock data matching the future backend DTO contracts. Live API calls will be enabled in Phase 5 without touching page components.
3. **PDF Reader Real Binary Validation:** The Web PDF Reader will be tested and visually verified using a bundled `public/sample.pdf` before Phase 3 is considered complete.

---

## 5. Historical Pre-Phase 1 Review — 2026-11-12

- Removed the duplicate JJWT dependency block from `backend/pom.xml`. Exactly one declaration remains for each of `jjwt-api`, `jjwt-impl`, and `jjwt-jackson` at version `0.12.6`; implementation/Jackson runtime scopes are unchanged. Removing all JWT dependencies is deferred to an approved session implementation.
- Set `spring.flyway.baseline-on-migrate: false` for the new database. Empty schemas execute migrations normally; managed schemas validate history; non-empty unmanaged schemas fail instead of being silently baselined. `ddl-auto: validate` remains unchanged.
- Preserved `V1__init.sql` byte-for-byte: SHA-256 `E9D27011048DE4F32A899903BCC38BC6EA96093D16A97756D7E545F317247498`. It contains comments only. No new migration was added and `git diff` shows no migration changes.
- Started the installed Docker Desktop engine because it was stopped. The existing `openshelf-db` container resumed with its persistent volume; no container/volume recreation or database reset was performed.
- Read-only database checks before and after tests found only `public.flyway_schema_history`, containing the same successful SQL V1 row (`V1__init.sql`, Flyway checksum `1233558564`). There are no application/business tables yet.
- A full logical schema/data dump was hashed in memory before and after tests, with PostgreSQL's random `\restrict`/`\unrestrict` markers excluded. Both SHA-256 digests were `A8FF402746F274810F42EFE11921DEF27F67EC1B0D4B15AEA8AC9BF016B8E261`. No dump contents were written to the repository. This verifies logical schema/data preservation, not physical database-file identity.
- Executed `powershell -ExecutionPolicy Bypass -File scripts\test-backend.ps1`: **BUILD SUCCESS; tests 1, failures 0, errors 0, skipped 0**, Maven total time 1:18. Java 23.0.1 compiled with `--release 21`. Flyway validated one migration and reported schema version 1 up to date, with no migration necessary. Surefire XML independently confirms the counts.
- The initial sandboxed attempt failed in the wrapper before Maven started; the permitted retry with cache/database access passed. The helper returned process exit 0 even on that first wrapper failure, so future test isolation work must also propagate the Maven exit code. This review uses the actual Maven summary and Surefire report rather than trusting that helper exit code alone.
- Maven emitted non-failing HTTP 401 metadata warnings for Flyway/Redgate repository prefix feeds and Mockito dynamic-agent/JVM warnings. No duplicate-JJWT model warning appeared in the successful run. No repository/dependency upgrades were made to suppress unrelated warnings.
- Executed frontend `npm.cmd run build` and `npm.cmd run lint`: both exited 0. Lint reported one existing `react(only-export-components)` Fast Refresh warning at `src/components/ui/button.tsx:57`; frontend source was not changed.
- Current test coverage is only application context startup against the local database. Authentication behavior is unimplemented and untested; disposable PostgreSQL integration tests and browser protocol tests are required in Phase 1.
- Added the [Authentication design proposal](../architecture/authentication-design.md) and revised Phase 1 roadmap tasks as **pending review**. The proposal recommends server-side sessions, a production HttpOnly/Secure/SameSite cookie, session-backed CSRF bootstrap/rotation, and Argon2id. No Authentication code, user table, or new migration was implemented. No commit or push was performed.

---

## 6. Phase 1 Implementation and Verification — 2026-11-12

- Implemented the approved [session Authentication design](../architecture/authentication-design.md). The full [implementation report](phase-1-implementation.md) includes file inventory, API contracts, reproduction commands, and limitations.
- Removed unused JJWT dependencies after confirming no source references. No JWT, refresh tokens, Bearer authentication, or credential storage in localStorage/sessionStorage was added.
- Added only forward migration `V2__create_users_table.sql`: UUID, unique normalized email, password hash, display name, constrained role, and UTC timestamps. Public registration always assigns ROLE_USER and rejects extra fields, including role/id injection.
- Passwords use Argon2id with Bouncy Castle 1.86: 19,456 KiB memory, 2 iterations, parallelism 1, random 16-byte salt, and 32-byte hash. DTOs and API responses exclude hashes; credential and CSRF DTO logging is redacted.
- Added JSON `/api/v1/auth/csrf`, `/register`, `/login`, `/me`, and `/logout` behavior. Registration returns 201 without logging in; duplicate email 409; invalid credentials/anonymous `/me` 401; logout 204.
- Spring Security explicitly applies session fixation and CSRF rotation strategies and saves the SecurityContext. Cookies are HttpOnly, SameSite=Lax, host-only, Path=/, and Secure by default; local HTTP uses a separate non-Secure cookie name. Idle timeout is 30 minutes, session tracking is cookie-only, and logout invalidates the session and expires its cookie.
- CSRF remains enabled, including registration/login/logout. React bootstraps a session-backed masked token, sends X-CSRF-TOKEN on unsafe requests, and renews it after login/logout. Expired tokens trigger renewal and explicit resubmission, without automatic mutation replay.
- React adds typed services/contracts, AuthContext/useAuth, login/register pages, a protected account page, loading/retry states, and `/me` session restoration. TanStack Query owns the user response and removes private caches on logout, login/account change, and detected session expiry. Backend remains layer-based; frontend remains folder-by-type.
- Added bounded single-instance credential throttling with standard JSON 429 and Retry-After responses. Admin routes require ROLE_ADMIN; no public role selection or admin provisioning API exists.
- Backend tests now always use disposable PostgreSQL 17 Testcontainers. The helper forces the test profile, does not load `.env`, restores the caller's location/profile, and propagates Maven failures. An intermediate failing suite returned exit 1; the final passing suite returned exit 0.
- **Backend:** 19 tests passed; 0 failures, 0 errors, 0 skipped, Maven total 1:19. Coverage includes registration, duplicate races, validation/role injection, Argon2id, real CSRF tokens, session persistence/rotation, logout, deleted users, USER denial on admin routes, throttling, production cookie flags/timeout, V1→V2 preservation, and unmanaged-schema rejection.
- **Frontend:** TypeScript checks for application/tests/configs passed; 19 Vitest tests passed; production build passed; lint exited 0 with only the pre-existing `button.tsx` Fast Refresh export warning.
- **Browser:** Final run: 2 Playwright tests passed in 21.1 seconds in installed Microsoft Edge against the isolated backend and Vite proxy: register → login → refresh → current user → logout → protected route denied, plus mobile validation/overflow checks. Cookie HttpOnly/SameSite, login ID rotation, CSRF rejection, and empty credential storage were checked. The harness uses explicit loopback addresses and bounded backend readiness checks after earlier localhost/readiness timeouts; test retries remain disabled.
- V1 remains byte-identical (SHA-256 `E9D27011048DE4F32A899903BCC38BC6EA96093D16A97756D7E545F317247498`). The original development database remains at V1 and its logical SHA-256 still matches the pre-review value `A8FF402746F274810F42EFE11921DEF27F67EC1B0D4B15AEA8AC9BF016B8E261`. V2 was verified only in disposable databases and will apply at the next normal backend startup. No reset, applied-migration edit, commit, or push occurred.
- Non-failing Maven warnings remain for external Flyway/Redgate repository metadata feeds and Mockito/JVM agent loading. Production HTTPS termination and trusted proxy handling require deployment configuration; production cookie attributes are tested, but a deployed HTTPS environment was not exercised.

---

## 7. Phase 2 Implementation and Verification — 2026-11-12

- Added the warm-paper/forest-ink [design system](../design/design-system.md), semantic Tailwind v4 light/dark tokens, self-hosted Newsreader/DM Sans, restrained radii/surfaces, visible focus, and reduced-motion handling.
- Added `AppShell`, authentication-aware `AppHeader`, collapsible `AppSidebar`, tablet rail, mobile modal drawer, shared shelf links, local page/shelf search, brand, and `PageHeading`. Login/register remain outside the shell; the future reader will use its own layout.
- Restyled existing auth forms and account without changing authentication services, providers, context, CSRF, API contracts, or ProtectedRoute. Only explicit appearance preferences use localStorage; the default follows the device without writing storage.
- Home is a small, clearly labelled layout preview with illustrative covers, two reusable card examples, and the existing live health request. Private shelf destinations are protected layout previews, not book collections. Added a useful unknown-route page.
- Added only used Input, Badge, Dialog, and DropdownMenu primitives; retained shadcn conventions and folder-by-type source organization. No backend/business functionality or migration was added.
- **Final checks:** 26 Vitest tests passed (including all 19 Phase 1 tests), TypeScript application/test/config checks passed, production build passed, and lint passed without warnings. The previous unused Button variants export was removed.
- **Backend regression:** the mandated isolated Maven suite passed: 19 tests, 0 failures/errors/skips; total 2:32. The test profile and disposable PostgreSQL remained in use.
- **Browser:** 15 Playwright tests passed in 1.9 minutes in installed Microsoft Edge: two existing real-backend auth tests plus 13 layout tests. Verified light/dark 375/768/1280/1440px, overflow, 44px key controls, skip link, focus, drawer containment/Escape/selection/resize, search, sidebar collapse, theme persistence, protected shelves, account menu/logout, and mobile authenticated/server-error states. Eight full-page screenshots were visually inspected. Automated WCAG 2 A/AA and relevant 2.1 A/AA checks reported no violations in tested states.
- Initial browser checks caught decorative-cover contrast, a search accessible-name mismatch, and modal dropdown background handling; these were corrected before the successful run. The account dropdown is nonmodal; the navigation drawer remains modal.
- SHA-256 comparison against the pre-Phase 2 file snapshot confirmed all backend/migration files and auth service/provider/context/hooks/ProtectedRoute files unchanged. The original development database logical checksum still equals `A8FF402746F274810F42EFE11921DEF27F67EC1B0D4B15AEA8AC9BF016B8E261`. Test writes stayed in disposable databases.
- **Known limits:** production JS is 508.75 kB minified (164.23 kB gzip), triggering Vite's 500 kB advisory; consider route splitting as Phase 3 expands. No full screen-reader, Safari/Firefox, deployed HTTPS, or Lighthouse/CLS audit was performed. Book features, reader, and complete Explore remain deferred. No commit or push occurred.
- Full actual file inventory, commands, and screenshot evidence: [Phase 2 implementation report](phase-2-implementation.md).

## 8. Core Reading Experience — Milestone 1 (2026-11-13)

- Implemented lazy-loaded, protected `/read/:bookId`, separate from `AppShell`; open `/read/sample` through My Library or Continue Reading's clearly labelled sample link. Authentication and all backend source/migrations remain unchanged.
- Added PDF.js with a Vite-emitted local worker, real PDF loading/error/retry states, single-page and double-page spreads, previous/next and arrow-key navigation, validated page jumper/counter, 50–300% manual zoom, fit to width, fullscreen, percentage indicator, and responsive light/dark layout. Narrow screens use single-page mode.
- Bundled an original five-page CC0 PDF with source generation script and provenance/license notice. The PDF contains selectable text; selection does not create annotations. Only the active page/spread is rendered, with render cancellation, page cleanup, canvas pixel limits, and worker/document destruction on exit.
- Added preliminary typed book/progress contracts and replaceable mock services. Position restores after reload and library navigation; local keys include user, book, and document version. Invalid/obsolete local state is handled. Storage failures visibly fall back to tab memory. This is browser-only development state, not database-backed persistence, cross-device sync, or a private-data authorization boundary.
- **Frontend checks:** 38 Vitest tests passed (all 26 previous tests preserved); application/test/config TypeScript checks, production build, and lint passed. Vite retains the shared bundle size advisory: 511.61 kB minified; reader code is a separate 458.60 kB lazy chunk and its worker is a separate asset. Lint has no warnings.
- **Backend regression:** required isolated script passed: 19 tests, 0 failures/errors/skips, Maven BUILD SUCCESS in 1:43. SHA-256 comparison confirmed all 54 backend source/resource/test files plus seven frontend authentication/route-guard files unchanged from the start of this task.
- **Browser checks:** 22 Edge tests passed in 3.0 minutes, including all 15 existing auth/layout tests and seven new reader tests. Verified actual PDF pixels and worker, mouse text selection, navigation/final odd spread, zoom/fit, fullscreen, restoration, storage fallback, loading/retry, page bounds, mobile resize/keyboard, and real-session login → reader → reload → logout/route denial. Tested mobile dark state has no automated WCAG A/AA violations; desktop single/double and mobile screenshots were visually inspected.
- **Production preview:** all six reader browser tests also passed against the built assets in 37.9 seconds, including the hashed worker response. Production screenshots are retained in `docs/development/screenshots/reader-*.png`.
- Full file inventory, reproduction steps, screenshots, production preview checks, and limitations: [Milestone 1 report](reader-milestone-1.md). No upload, backend book CRUD, business migration, highlights, annotations, moderation, commit, or push was added.

## 9. Core Reading Experience — Milestone 2 (2026-11-13)

- Added only forward V3 `V3__create_private_books.sql`: private `books`, versioned `book_files`, ownership/indexes/constraints, and file integrity metadata. Existing V1/V2 hashes remain unchanged; no progress or annotation tables were added. Verification used disposable databases exclusively, without resetting or connecting to the development database.
- Added layered book controller/service/repositories/entities/DTOs/mapper and a `StorageService` abstraction with local implementation. PDFs live under an absolute configured root (default `${user.home}/.openshelf/storage/books`), outside public resources. Server-generated UUID keys use non-overwriting bounded writes, SHA-256, and cleanup on validation/stream/database/commit failure. Keys and paths are never returned by the API.
- Added authenticated, CSRF-protected multipart POST `/api/v1/books`, owner-only paginated GET `/books/mine`, detail, and full/range PDF delivery. All uploads are PRIVATE. Server checks extension, actual PDF signature and strict PDFBox parsing, page count, encryption, and configurable 30 MiB limits. Parsing does not guarantee malware safety.
- `/library` now loads real private books, supports upload validation/progress/errors/success and pagination, and opens the existing reader. Non-sample reader IDs load live metadata and credentialed private streams; the original CC0 demo remains operational. The reader layout/canvas/toolbar components are unchanged. Progress remains explicitly browser-local and isolated by user/book/immutable file ID.
- **Backend:** final suite: 34 tests passed with no failures/errors/skips (1:13), preserving existing auth checks and adding ownership, upload validation/limits, file integrity/keys, partial/commit cleanup, V2→V3 preservation, and full/partial/suffix/416 responses. **Frontend:** 43 tests passed; TypeScript application/test/config checks, lint, and production build passed. Existing bundle advisory remains (shared JS 519.95 kB; lazy reader 458.18 kB).
- **Browser:** full development suite 24/24 passed in 2.5 minutes, including all prior auth/layout/sample-reader checks. Two production upload tests then passed in 52.2 seconds with an actual child JVM restart, same disposable database/storage, reauthentication, same file ID, library access, and page restoration. Backend PID changed from 12348 to 30624. Six sample-reader tests also passed against built assets. Two distinct real users verified private metadata/file/list isolation; logout denied subsequent file access. Desktop library/reader and mobile upload screenshots were visually inspected.
- A first restart attempt hit a disposable PostgreSQL connection timeout; the test harness now uses explicit loopback and bounded connections, and the final restart run passed. The normal application's datasource/auth configuration was not changed for this test-only correction.
- Configuration examples, normal launch-helper allowlist, database/API/system/reader/design notes, and roadmap are synchronized. Full inventory, reproducible commands, API contracts, storage failure limits, and screenshots: [Upload Milestone 2 report](upload-milestone-2.md). No actual `.env`, backend auth/security flow, or existing migration was modified. No private uploaded binaries, commit, or push were added to Git.

## 10. Core Reading Experience — Milestone 3 (2026-11-14)

- Added forward V4 `V4__create_reading_progress.sql` with private user/book/immutable-file references, a composite book/file foreign key, unique user/file records, positive current/monotonic furthest pages, UTC timestamps and recent-reading indexes. V1/V2/V3 and the original CC0 sample remain byte-identical. Verification used disposable PostgreSQL only; no development data, volumes or existing uploads were reset or deleted.
- Added layered progress entity/repository/service/controller/DTOs/mapper. Owner-checked GET/PUT `/api/v1/books/{bookId}/progress` restore and save positions; PUT requires the existing CSRF protection and an explicit immutable `bookFileId`. Empty GET is `data: null`; stale versions receive 409. The atomic upsert prevents duplicate simultaneous first saves and retains the maximum reported page while allowing backward current-page navigation.
- Added paginated GET `/api/v1/library/continue-reading`, ordered by server activity time with an ID tie-breaker, latest-version filtering and fetch joins without N+1. The existing LibraryPage now displays real responsive Continue Reading cards and also serves the existing Continue Reading route, with skeleton/empty/error/retry, metadata fallback, progress/time/version, pagination and authoritative resume.
- The Reader loads matching server progress before mounting and waits for actual PDF readiness before first save. Real PDFs use a 1.5-second debounced serial queue with latest-position coalescing, no redundant presentation-only writes, explicit unsaved/saving/saved/failed status, retry and departure flush. My Library waits for a confirmed flush or an explicit leave-without-save choice after failure. Mode/zoom/resize preserve the explicitly selected canonical page; a spread's visible range is labelled separately.
- Uploaded PDFs never fall back to browser progress; previous private prototype positions are ignored. Only `/read/sample` retains labelled browser-local state. Existing AuthProvider/session/CSRF/ProtectedRoute and PDF rendering components remain unchanged. User-scoped caches are cleared by existing authentication behavior; queued sends check current account identity and late replies cannot populate another account's cache.
- **Backend:** 42 passed, zero failures/errors/skips, BUILD SUCCESS in 2:13, including existing auth/upload regressions, progress concurrency/validation/security/version/pagination tests, fresh V4 and V3→V4 preservation. Docker Desktop was initially stopped; tests passed after starting it. **Frontend:** 56 passed across 11 files; application/test/config TypeScript, lint and production build passed. Existing shared-bundle advisory remains (525.79 kB minified).
- **Browser:** full Edge suite **30/30 passed in 2.5 minutes**, including all auth/upload/sample-reader regressions, actual page-4 autosave/refresh/Continue Reading/fresh-context restore, same-browser account switching with another user's GET/PUT/list denial, presentation-only no-write assertions, serial/coalesced navigation, failure/retry, failed departure retention and expired-session removal. An initial new-test assertion incorrectly assumed every login redirects to Account; the final passing run preserves the app's existing intended-destination behavior.
- **Production:** 12/12 Edge checks passed in 2.0 minutes against built assets, including the real child JVM restart (PID 6268 → 3924) with the same disposable PostgreSQL and temporary storage. Sessions were lost as expected; reauthentication restored the identical confirmed page-4 progress record and private PDF. A final acceptance rerun with explicit mobile Continue Reading overflow/card assertions passed 1/1 in 34.5 seconds. Desktop Continue Reading, mobile Reader and mobile Continue Reading screenshots were visually inspected and retained. Full inventory, API/version/save semantics, commands, screenshots and limitations: [Milestone 3 report](reading-progress-milestone-3.md).
- **Limits:** only confirmed positions are durable; tab-close/termination delivery is best effort. Browser Back/unmount attempts a flush without a blocking router guard. Across independent tabs/devices, last database write wins for current page while furthest page remains monotonic; no distributed conflict resolution is claimed. New file versions start fresh; replacement management itself remains unimplemented. Finished Books and analytics are not included.

## 11. Milestone 4 Design Proposal (2026-11-14)

- Created [Private Bookmarks & Personal Table of Contents design](../architecture/bookmark-design.md) after reviewing the current source, V1–V4, relevant documentation and retained UI screenshots. It proposes focused Reader keyboard/toolbar/status/fullscreen improvements, a responsive bookmark sidebar, book/file-version-scoped private groups and bookmarks, proposed V5 constraints/API contracts, small implementation steps and a complete security/persistence/regression acceptance plan.
- Proposed defaults: one bookmark per user/file/page, editable title and named color, optional flat group, non-destructive group deletion to Ungrouped, explicit file consistency and revision conflicts. These are pending implementation review, not shipped functionality. The existing speculative combined-annotations V5 roadmap entry is narrowed in the proposal; no V5 migration exists or has been applied.
- This task changes documentation only. No application code, dependency, Authentication behavior, applied migration, development data or uploaded PDF was changed. Existing Milestone 3 working-tree changes are preserved. Tests/builds were not rerun for this design-only task; the Milestone 3 results above remain historical verified results. No commit or push was made.

## 12. Recommended Next Task

**Review the [Milestone 4 proposal](../architecture/bookmark-design.md), then separately authorize its implementation.** Bookmarks and groups remain unimplemented. Public publishing, moderation, highlights/notes, reviews, EPUB and S3 remain deferred. Book editing/deletion and storage orphan reconciliation also remain future work.

Phase 1 covers registration, login, logout, and profile retrieval. Profile editing, password recovery/change, email verification, MFA, admin provisioning/management, and durable or clustered sessions remain separate work. In-memory sessions are lost on backend restart; evaluate recovery and email verification before a public production launch.
