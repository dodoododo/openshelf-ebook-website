# Core Reading Experience — Milestone 1

Implemented 2026-11-13. Frontend PDF Reader prototype only. No commit or push.

## Try the reader

Start the existing backend and frontend using the normal development scripts, sign in, then open **My Library → Open sample reader** or visit `/read/sample`. The reader uses real session authentication; book metadata and reading position are explicitly mocked. Unknown book IDs show an unavailable state.

The sample is **A Quiet Place to Read**, an original five-page CC0 fixture. The public PDF contains no uploaded/private content. `frontend/public/SAMPLE-LICENSE.md` documents provenance and redistribution; `python scripts/create-sample-pdf.py` rebuilds it with ReportLab. SHA-256: `45A2E7E6510A91F5EDA7AB58D774576E772F2A5C8C271A66EC67EB89E67AB335`.

## Completed behavior

- Dedicated protected `/read/:bookId`, outside the main application shell; route-level lazy loading avoids putting PDF.js into the initial authentication bundle.
- Actual PDF.js document/worker loading, byte-loading indicator, useful document/page errors, retries, and selectable text. The worker comes from the installed `pdfjs-dist` package using Vite `?url`, so development and production use the same matching version without a CDN. Rendering follows the [official PDF.js page/viewport lifecycle](https://mozilla.github.io/pdf.js/examples/).
- Single-page mode and double-page spreads `(1,2), (3,4), (5)`, Previous/Next, keyboard arrows, page count/jump, and percentage. No cover offset. The starting visible page determines position/percentage; reaching the last page does not change a finished-book record.
- Manual 50–300% zoom changes the fixed PDF viewport; fit-to-width scales to the available width. Fit is allowed outside manual zoom bounds. Fullscreen observes native exit and handles unsupported/rejected requests. Desktop starts at 100%; mobile starts fitted.
- Below 768px, single-page mode is enforced and double-page mode is disabled. Changing to a spread anchors to its first page, including after resizing. Reader surfaces follow existing semantic light/dark tokens, Tailwind v4, shadcn Button/Input/Badge, and the existing ThemeProvider.
- Only active pages are mounted. Each render owns a canvas, cancels old work, and frees backing pixels; navigation cleans page resources. DPR is capped at 2 and each canvas at eight million pixels. Document/worker/network resources are destroyed on exit. A small internal PDF.js text-measurement canvas may exist separately from visible page canvases.

## Mock progress contract and limits

`BookDetail`, `ReadingProgress`, and `MockProgressResult` live in `src/types/`. Book/progress services return `Promise<ApiResponse<T>>`; TanStack Query loads them. UI components do not directly use Axios or browser storage. The PDF loading hook consumes the service-provided URL.

Reading positions write immediately to `openshelf:mock-progress:v1:<user>:<book>:<documentVersion>`. The local service writes before resolving its promise, so rapid navigation and reload do not depend on a delayed unload save. Remounting the reader reloads local state; stale query data is discarded when the route unmounts. Invalid JSON, mismatched versions, and invalid positions are ignored; positions beyond the actual document are clamped. Storage denial/quota failure falls back to tab memory and changes the visible persistence message.

Browser state remains editable and readable on the same device. Keys prevent accidental UI mixing between accounts; they do not provide security or server authorization. It survives normal logout until cleared from the browser, and it does not sync across devices. Credentials/session identifiers/CSRF are never stored by this service. A storage fallback is lost on full reload. The static CC0 sample is intentionally publicly fetchable; private PDFs must never be placed in `public/`.

Only page position is restored. Zoom, layout mode, and the within-page scroll offset are not persisted. Continuous document scrolling, fit-to-page, wheel zoom, upload, book CRUD, database-backed progress, bookmarks, highlights, annotations, and publishing/moderation remain deferred. No large-document benchmark, heap profiling, full screen-reader audit, Safari/Firefox, or physical mobile-device/touch-selection test was performed. Poppler is unavailable here; visual PDF fidelity was inspected from real PDF.js/Edge screenshots instead.

## Executed verification

- `npm.cmd run build`: passed, including application TypeScript checks and production assets. Lazy reader JS 458.60 kB minified; reader CSS 4.73 kB; separate local worker 1,271.91 kB. The existing shared-bundle advisory remains at 511.61 kB minified. No unrelated bundle refactoring was done.
- `npm.cmd run test:types`: passed, including source, tests, and configurations.
- `npm.cmd test`: **38 passed** in six files, preserving all 26 existing tests. Added navigation boundaries, odd/even spreads, mock-book lookup, per-user/book/version restoration, malformed state, storage denial/quota fallback, and invalid-write tests.
- `npm.cmd run lint`: passed without warnings.
- `powershell -ExecutionPolicy Bypass -File scripts/test-backend.ps1`: **19 passed**, zero failures/errors/skips, Maven BUILD SUCCESS in 1:43. The first sandbox attempt failed in the Maven wrapper before tests started; the permitted retry passed using disposable PostgreSQL Testcontainers. Existing external Maven metadata 401 and JVM/Mockito warnings remain non-failing.
- `npm.cmd run test:e2e`: **22 passed in 3.0 minutes** in installed Edge. All 15 prior auth/layout tests remain unchanged. Six reader presentation tests load actual PDF bytes (only auth presentation is stubbed); one reader-session integration test uses the real isolated backend.
- Production preview: after `npm.cmd run build`, served `npm.cmd run preview -- --host 127.0.0.1 --port 5174 --strictPort`, then ran `npm.cmd run test:e2e -- tests/e2e/reader.spec.ts --workers=1 --output=test-results/production`: **6 passed in 37.9 seconds**. This verifies the emitted hashed worker and built reader, in addition to Vite development mode.
- Real browser checks cover nonblank canvas pixels, actual worker response, mouse text selection, single/double page counters, final unpaired page, zoom/fit/fullscreen, repeated page turns with bounded visible canvases, reload and library-return restoration, account separation, malformed bounds, PDF loading/error/retry, storage fallback, guest protection, keyboard navigation, 375px mobile fitting, and breakpoint changes. Mobile dark state passes tested WCAG 2 A/AA and 2.1 AA automated checks. Existing layout tests retain their 375/768/1280/1440px coverage.
- Real authentication checks cover registration, return-to-reader login, session restoration, page restoration, live `/auth/me`, CSRF-protected logout, and reader denial after session invalidation. Existing cookie rotation, HttpOnly/SameSite, CSRF rejection, and empty credential-storage checks also passed.
- SHA-256 comparison of all 54 backend source/resource/test files and seven frontend authentication/route-guard files against a task-start snapshot: **61 unchanged**. No backend source, migration, auth service/provider/context, or ProtectedRoute was edited. All test writes used disposable databases.
- `git diff --check`: passed; Git emits existing Windows LF/CRLF notices. Dependency installation reported zero audit vulnerabilities.

The initial browser pass exposed an incorrect global canvas-count assertion (PDF.js owns a separate measurement canvas) and a spread-to-mobile page anchor issue. The assertion now counts only reader page canvases; the page anchor was fixed before the successful full run. The first sandboxed browser runner needed interruption during teardown; the permitted full run completed with exit 0.

## Visual evidence

These screenshots were captured from the production build and visually inspected. PDF typography, page rules/footers, controls, and page geometry render cleanly; dark mode changes the reader surfaces while keeping the document's original colors.

- [Desktop single page, 1280 × 1000](screenshots/reader-desktop-single.png)
- [Desktop double page, 1280 × 1000](screenshots/reader-desktop-double.png)
- [Mobile dark mode, 375 × 812](screenshots/reader-mobile-dark.png)

## Browser test reproduction

With Docker Desktop running, start the existing isolated test server from `backend/`:

```powershell
.\mvnw.cmd test-compile spring-boot:test-run "-Dspring-boot.run.main-class=com.openshelf.BrowserTestApplication"
```

It uses port 18080 and disposable PostgreSQL, never the normal development database. From `frontend/`, run `npm.cmd run test:e2e`; Playwright serves Vite on 5174 with the proxy targeting 18080. Stop the test backend after checking. Tests require installed Edge on Windows.

## Actual task file inventory

- Dependency manifests: `frontend/package.json`, `frontend/package-lock.json` (`pdfjs-dist`).
- Route/entry changes: `frontend/src/routes/index.tsx`, `frontend/src/pages/ShelfPreviewPage.tsx`.
- Reader page/rendering: `frontend/src/pages/ReaderPage.tsx`, `frontend/src/components/reader/PdfPage.tsx`, `PdfSpread.tsx`, `ReaderToolbar.tsx`; `frontend/src/hooks/usePdfDocument.ts`, `frontend/src/lib/pdf.ts`, `frontend/src/utils/reader.ts`, `frontend/src/styles/reader.css`.
- Contracts/services: `frontend/src/types/book.ts`, `readingProgress.ts`; `frontend/src/services/bookService.ts`, `readingProgressService.ts`, `mocks/books.ts`.
- Fixture/provenance: `frontend/public/sample.pdf`, `SAMPLE-LICENSE.md`, `scripts/create-sample-pdf.py`.
- Tests: `frontend/tests/reader.test.ts`, `frontend/tests/e2e/reader.spec.ts`, `readerSession.spec.ts`.
- Documentation: `docs/development/current-state.md`, this report, `docs/development/roadmap.md`, `docs/design/reader-spec.md`, `docs/design/design-system.md`, `docs/architecture/system-design.md`, and the screenshot evidence linked below.

Existing unrelated working-tree changes were preserved; the inventory above describes this task, not the repository's complete uncommitted diff.

## Recommended next milestone

**Private PDF Upload & Book Storage.** Separately approve its backend scope, then implement private-by-default ownership, validated PDF upload, storage outside public assets, authenticated metadata/streaming with byte ranges, a minimal real library path, and ownership/format/size/error tests. Keep real progress persistence and annotations separately scoped. This milestone did not add speculative business tables or APIs.
