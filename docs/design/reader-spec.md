# OpenShelf — Web PDF Reader Technical Specification

## 1. Overview & Objectives

The OpenShelf Web Reader provides an in-browser reading experience for uploaded PDF documents. The reader must balance fast page loading, responsive canvas rendering, interactive annotations, and seamless reading progress synchronization across sessions.

### Implemented subset — Core Reading Milestone 1 (2026-11-13)

- Protected `/read/:bookId` uses a dedicated layout outside `AppShell`; `/read/sample` resolves typed mock book metadata. The existing library and continue-reading previews link to it without becoming a full library implementation.
- PDF.js loads the real, original CC0 five-page `public/sample.pdf`. Vite's `?url` import emits a matching local worker. `scripts/create-sample-pdf.py` rebuilds the fixture; `public/SAMPLE-LICENSE.md` records provenance. No private upload is bundled.
- Single-page and paired spreads `(1,2), (3,4), (5)` use stepped navigation, Previous/Next, arrow keys, a validated page jumper, page counter, and percentage. There is no cover offset. Milestone 3 supersedes the original starting-page convention: progress now means the explicitly selected canonical page divided by total pages; it does not mark a book finished.
- Manual zoom is 50–300%; fit-to-width may scale below or above that range to match the viewport. Desktop opens at 100%; mobile opens fitted. Below 768px the reader uses single-page mode and disables the double-page control. A spread contains the selected page without changing it; toggling modes or resizing does not persist a new position.
- Fullscreen uses the browser API, observes native exit, and reports rejection or unsupported browsers. Canvas pixels account for device pixel ratio (capped at 2) and an 8-million-pixel budget per page. The text-selection layer uses the same viewport geometry; selection creates no annotation.
- Only one page or the current two-page spread is mounted. Navigation cleans page resources; zoom/page/unmount cancels rendering, releases canvas backing pixels, and destroys text layers. Leaving the reader destroys the loading task, PDF cache, network work, and worker.
- Mock book and progress services use `Promise<ApiResponse<T>>`; TanStack Query loads them. Browser progress writes immediately on position changes, under a versioned `(user, book, documentVersion)` key. Invalid state is ignored; out-of-range pages are clamped after loading the actual PDF. Failed browser storage uses a clearly labelled tab-memory fallback. No credentials or CSRF tokens enter storage.
- This is local prototype persistence, not a private-data security boundary or database sync. The CC0 static sample is publicly fetchable. Real books must later use ownership-checked private streaming. There is no API toggle silently falling back to a nonexistent backend.

Continuous scrolling, fit-to-page, persisted reader preferences, wheel zoom, annotations, bookmarks, and moderation remain future work. Upload and backend progress are implemented by the later milestones below. See [Milestone 1 implementation and verification](../development/reader-milestone-1.md) for executed checks and limits.

### Milestone 2 integration

The reader layout and page-rendering components are preserved. Non-sample book IDs now load live owner-checked metadata through `bookService.ts`; PDF.js uses the private `/api/v1/books/{id}/file` URL with credentials. No uploaded PDF is copied into `public/`. An expired-session 401 from document loading clears the client session through the existing authentication event. The badge distinguishes a real private PDF from the mock sample, while the browser-only progress notice stays visible. The immutable `book_files.id` supplies `documentVersion`, preserving isolation across future file versions. The original CC0 sample and all single/spread/zoom/text-layer behavior remain operational. Upload is implemented by Milestone 2; Milestone 3 below supersedes private browser-local progress. Annotations remain deferred.

---

### Milestone 3: account progress and Continue Reading

- Real private books load the owner-checked progress API before mounting a reader session. GET includes the immutable file ID; a version mismatch fails explicitly. No page-1 write can occur before restoration, and saving starts only after actual PDF page count matches metadata. A new reader stores page 1 after PDF readiness. A saved record displays Saved after its confirmed GET, without a redundant PUT.
- Canonical page means the last explicitly selected page: e.g. page 4 remains page 4 when displaying spread 3-4, returning to single mode, zooming, or resizing. Turning a spread chooses the leading page of the next/previous spread. Page input and percentage use the canonical page; a separate label identifies the visible spread.
- `useReadingProgressSave` owns one 1.5-second debounced serial queue per user/book/file reader session. Navigation updates UI immediately, pending changes coalesce to the latest page, and only one PUT is in flight. Responses confirm stored state without moving the displayed page. Unchanged values are skipped. Furthest page represents the maximum page reported to PostgreSQL; pages traversed only during debounce are not individually recorded.
- Unsaved changes, Saving, Saved, and Save failed are visible. Failure stops automatic retries until manual Retry or a new navigation. My Library waits for a flush; failure retains the reader with an explicit leave-without-saving choice. Unmount/visibility change attempts a flush, and beforeunload warns while dirty. Browser shutdown, lost connectivity, and abrupt termination cannot guarantee delivery; only a confirmed save is durable.
- Uploaded books never fall back to localStorage. Earlier prototype positions for private books are ignored, not migrated. `/read/sample` alone retains the existing user/book/version-scoped browser state and labelled memory fallback.
- Continue Reading is a real section of the existing `LibraryPage`, also used at `/library/continue-reading`, with metadata fallback, page/percentage, last-read time, version, resume links, pagination, loading skeleton, empty state, and retry. It includes last-page books; there is no Finished Books classification.
- Queries are scoped by authenticated user and removed by the existing auth provider on logout/account change/expiry. Pending saves check the current account before sending; late responses cannot repopulate another account's cache. Across independent tabs/devices, the last database write wins for current page while furthest page remains monotonic. There is no distributed conflict resolution or realtime synchronization.

See [Milestone 3 implementation and executed verification](../development/reading-progress-milestone-3.md).

---

## 2. Planned Reader Capabilities

### 2.1 Rendering Engine
- **Engine:** PDF.js (`pdfjs-dist`) running inside a React component wrapper.
- **Worker Configuration:** Web Worker offloading for PDF parsing, text layer extraction, and font glyph compilation to prevent UI thread blocking.
- **Chunked Loading:** HTTP range requests (`Range: bytes=...`) enabling instant viewing of the first pages before the entire file is downloaded.

### 2.2 Navigation & Display Modes
- **Single Page View:** Standard portrait viewing mode ideal for mobile devices and narrow windows.
- **Double Page (Spread) View:** Two-up layout mimicking physical book spreads, with optional cover page offset handling.
- **Continuous Vertical Scroll:** Fluid vertical reading experience with virtualized page rendering (rendering only visible and adjacent viewport pages).
- **Stepped Horizontal Navigation:** Page-by-page or spread-by-spread horizontal pagination with optional page-flip transitions.
- **Page Jumper:** Instant navigation input allowing users to jump directly to page numbers or table-of-contents nodes.

### 2.3 Viewport & Scaling
- **Fit-to-Width:** Adjust canvas scale so document pages span the reader container width.
- **Fit-to-Page:** Scale pages to fit entirely within the vertical and horizontal viewport bounds.
- **Custom Zoom:** User-controlled zoom percentage (50% to 300%) with mouse-wheel and keyboard shortcuts.
- **Fullscreen Mode:** HTML5 Fullscreen API integration for distraction-free reading.

---

## 3. PDF Zoom vs. EPUB Reflow Distinction

> [!IMPORTANT]
> It is critical to architecturally separate the mechanics of PDF reading from future EPUB capabilities:
> - **PDF (Fixed Layout):** PDF documents possess fixed coordinates and absolute typography. "Zooming" scales the rendered viewport/canvas pixels; it **does NOT reflow text** or alter line lengths. Text highlights depend on fixed page coordinates (bounding boxes).
> - **EPUB (Reflowable Layout):** EPUB documents are reflowable XHTML/CSS. Increasing font size changes line wrapping, page count, and structural pagination dynamically.
> 
> The initial OpenShelf reader is engineered specifically for **fixed-layout PDF geometry**.

---

## 4. Page-Specific Annotations & Coordinates

### 4.1 Highlight Anchoring Architecture
When a user selects text on a PDF page:
1. PDF.js text layer provides the normalized bounding rectangles: `[x1, y1, x2, y2]` relative to the page's unscaled coordinate system (`viewport.viewBox`).
2. The extracted text string, page number, and normalized coordinates are stored in the backend database.
3. Upon page rendering, the annotation layer overlays semi-transparent SVG or canvas rectangles positioned using these normalized coordinates scaled to the current render factor.

### 4.2 Document Versioning Considerations
- If an author or administrator uploads a revised version of a PDF, page numbering or text offsets may shift.
- To prevent annotation corruption, book records must track an immutable `document_version` or file hash (`file_hash`).
- User highlights and bookmarks are tied to the exact document version hash they were created on.

---

## 5. Major Technical Risks & Mitigation

| Technical Risk | Impact | Planned Mitigation |
| :--- | :--- | :--- |
| **Large PDF Memory Consumption** | Browser tab crash on 500+ page books | Implement DOM & canvas virtualization; destroy canvases outside active viewport buffer |
| **Mobile Canvas Scaling / Blur** | Low DPI rendering on Retina displays | Scale canvas rendering using `window.devicePixelRatio` while maintaining CSS display dimensions |
| **Frequent Progress Sync Traffic** | API spam when user rapidly scrolls | Debounce progress synchronization (e.g. 1.5 second idle delay) and attempt a flush on departure; tab-close delivery is best effort |
| **PDF DRM / Direct URL Leak** | Unauthorized file extraction | Deliver PDF stream via authenticated API with session tokens or short-lived presigned URLs |
