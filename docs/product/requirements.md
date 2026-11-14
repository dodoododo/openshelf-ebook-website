# OpenShelf — Product Requirements Document (PRD)

## 1. Document Scope

This document details the confirmed functional and non-functional requirements for the OpenShelf platform, establishing the technical foundation for development phases.

---

## 2. Confirmed Functional Requirements

### 2.1 Authentication & Account Management
- **User Registration:** Email and password registration with format validation.
- **User Authentication:** Spring Security server-side sessions with HttpOnly cookies and session-backed CSRF protection; see the approved authentication design. Phase 1 includes registration, login, current-user retrieval, and logout.
- **Account Profiles:** Basic profile view and modification (display name, avatar placeholder, account preferences).
- **Role-Based Authorization:** Strict boundary distinction between standard Users (`ROLE_USER`) and Administrators (`ROLE_ADMIN`).

### 2.2 Book Management & Digital Vault
- **PDF Upload:** Authenticated users can upload PDF format digital books.
- **Default Privacy:** All newly uploaded books must be **strictly private** to the uploading user by default.
- **Book Metadata Management:** Title, author, description, language, page count, and cover preview.
- **Publication Workflow:**
  - Users can request publication of their uploaded books to make them publicly visible.
  - Administrators review publication requests in a moderation queue.
  - Administrators can approve or reject requests with review notes.
  - Only explicitly approved books are listed in public catalogs.
- **Discovery & Catalog:**
  - Public search and keyword filtering (by title, author, genre).
  - Public catalog browsing available to all users.

### 2.3 Web Reader Experience
- **Rendering Engine:** Web-based PDF rendering using PDF.js.
- **Display Modes:** Single-page view and double-page (spread) view.
- **Navigation Controls:** Vertical continuous scrolling and horizontal page-by-page stepping.
- **Viewport Adjustments:** Zoom in/out, fit-to-width, fit-to-page, and distraction-free fullscreen mode.
- **Progress Tracking:** Visible page indicator (`Page X of Y`), reading percentage indicator, and quick page navigation jumper.
- **Interaction Polish:** Optional realistic page-flip animation.
- **Future Considerations:** EPUB document format support planned for a subsequent phase.

### 2.4 Personal Reading Data (Strictly Private)
- **Automatic Progress Persistence:** As the user reads, the current reading position is periodically and automatically synchronized to the backend.
- **Continue Reading:** Seamless resumption of books from the exact last reading position across sessions.
- **Completion Tracking:** Readers can mark books as completed/finished with completion timestamps.
- **Custom Bookmarks:** Creation of custom bookmarks with user-defined labels and color tags.
- **Bookmark Organization:** Grouping bookmarks into custom categories or personal table-of-contents segments.
- **Highlights & Notes:**
  - Text selection and color highlight persistence.
  - Page-anchored or highlight-anchored personal thoughts and annotations.
- **Reader Preferences:** Persistence of reader settings (reading direction, zoom level, default layout mode, theme).

### 2.5 Personal Library Sections
- **Continue Reading:** Books in active progress sorted by most recently accessed.
- **Finished Books:** Archive of completed literature.
- **My Library:** Master view of all private and collected titles.
- **My Published Books:** Books submitted and approved for community distribution.
- **My Favourites:** Bookmarked favorite titles for quick access.

---

## 3. Future Phase Requirements (Community Features)

The following items are deferred to a subsequent milestone:
- Book ratings and written community reviews.
- Public user profile activity feeds.
- Social interactions (following readers, discussions, shared collections).
- Automated book recommendation algorithms.

---

## 4. Non-Functional & Security Requirements

- **Document Isolation & Privacy:** While a single PDF master file or approved community book may be referenced by multiple users, every user's progress, bookmarks, highlights, and notes must remain completely private and isolated.
- **Copyright & Licensing Safeguards:** Administrative approval does not imply copyright clearance; public submissions require explicit copyright/open-license assertions.
- **Performance:** Sub-second API responses for reading progress sync and metadata queries; stream-optimized chunked delivery for PDF assets.
- **Reliability:** ACID-compliant relational persistence via PostgreSQL with strict schema migrations managed by Flyway.
- **Maintainability:** Strict adherence to Layered Architecture across frontend and backend.
