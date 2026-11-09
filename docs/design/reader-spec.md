# OpenShelf — Web PDF Reader Technical Specification

## 1. Overview & Objectives

The OpenShelf Web Reader provides an in-browser reading experience for uploaded PDF documents. The reader must balance fast page loading, responsive canvas rendering, interactive annotations, and seamless reading progress synchronization across sessions.

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
| **Frequent Progress Sync Traffic** | API spam when user rapidly scrolls | Debounce progress synchronization (e.g. 1.5 second idle delay) and flush on window unload |
| **PDF DRM / Direct URL Leak** | Unauthorized file extraction | Deliver PDF stream via authenticated API with session tokens or short-lived presigned URLs |
