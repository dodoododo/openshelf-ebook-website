# OpenShelf — Development Roadmap & Implementation Phases

> **Workflow Strategy:** Frontend-First Development after Authentication  
> **Architecture Mandate:** Traditional Layered Architecture (Backend) + Folder-by-Type Architecture (Frontend)

---

## Roadmap Overview

```mermaid
flowchart LR
    P0["Phase 0: Bootstrap (Done)"] --> P1["Phase 1: Authentication"]
    P1 --> P2["Phase 2: UI/UX Design System"]
    P2 --> P3["Phase 3: Frontend Pages (Prototypes)"]
    P3 --> P4["Phase 4: Backend Business Core"]
    P4 --> P5["Phase 5: API Integration"]
    P5 --> P6["Phase 6: Testing & Hardening"]
    P6 --> P7["Phase 7: Cloud & Deployment"]
```

---

## Phase 0: Project Initialization & Bootstrap (Completed)

- [x] Monorepo workspace initialization with clean root structure.
- [x] Docker Compose setup with PostgreSQL 17 Alpine and health check on `127.0.0.1:5432`.
- [x] Spring Boot 4.1.2 backend bootstrap with Java 21 LTS (`--release 21`), Flyway baseline (`V1__init.sql`), Spring Security 7, and Actuator.
- [x] Complete backend Layered Architecture packages registered with `package-info.java`.
- [x] React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + shadcn/ui frontend bootstrap.
- [x] Folder-by-type architecture established for frontend.
- [x] Central Axios client, TanStack Query provider, and Vite proxy configuration (`/api`, `/actuator` -> `:8080`).
- [x] Interactive bootstrap page verifying live end-to-end connectivity.
- [x] Comprehensive documentation suite and AI engineering governance (`AGENTS.md`).

**Milestone:** Verified full-stack baseline running across Docker, Spring Boot, and React.  
**Acceptance Criteria:** `mvnw clean test` passes with 0 failures; `npm run build` passes with 0 errors; `/actuator/health` returns HTTP 200 `UP`.

---

## Phase 1: Full-Stack Authentication & User Management

### Objectives
Establish secure, production-ready user identity management across backend and frontend before initiating feature prototyping.

### Tasks
- [ ] **Database Migration:** Create `V2__create_users_table.sql` (UUID, email, password_hash, display_name, role, timestamps).
- [ ] **Backend Domain & Persistence:** Create `User` entity, `Role` enum (`ROLE_USER`, `ROLE_ADMIN`), and `UserRepository`.
- [ ] **Security & JWT:** Configure `BCryptPasswordEncoder`, `JwtService` (token generation, parsing, claim validation), and `JwtAuthenticationFilter`.
- [ ] **Auth REST API:** Implement `AuthController` and `AuthService`:
  - `POST /api/v1/auth/register` (with Jakarta Bean Validation).
  - `POST /api/v1/auth/login` (credential verification and JWT issuance).
  - `GET /api/v1/auth/me` (current authenticated user profile).
- [ ] **Exception Handling:** Centralized `GlobalExceptionHandler` mapping validation errors, duplicate emails, and invalid credentials.
- [ ] **Frontend Auth Layer:**
  - Token storage utility (`localStorage` / memory with secure refresh strategy).
  - Central Axios auth request interceptor (`Authorization: Bearer <token>`).
  - `AuthContext` and custom `useAuth` hook managing user session state.
- [ ] **Frontend Auth Pages:**
  - Login page (`/login`) with form validation.
  - Registration page (`/register`) with form validation.
  - Protected route wrapper (`<ProtectedRoute />`) redirecting unauthenticated users.

**Milestone:** Complete registration, login, session persistence, and profile retrieval working end-to-end between React and Spring Boot.  
**Acceptance Criteria:**
- User can register with valid credentials; duplicate email returns HTTP 409 with user-friendly error.
- User can log in and receive valid JWT; protected endpoints reject requests without valid Bearer token.
- Refreshing browser preserves active session.
- Passwords stored as salted BCrypt hashes.

---

## Phase 2: UI/UX Design System, Design Tokens & Core Layout

### Objectives
Establish a cohesive, modern visual design system, typography scale, color palette, and responsive shell before building individual feature screens.

### Tasks
- [ ] **Design System Foundations:**
  - Refine Tailwind CSS v4 design tokens in `src/styles/globals.css` (primary, secondary, muted, accent, borders, radius, shadows).
  - Configure Dark / Light mode CSS variables and theme toggle hook.
  - Typography scale and font stack for readability and book metadata display.
- [ ] **Core Layout Components (`src/components/layout/`):**
  - `AppHeader`: Logo, navigation links, search trigger, theme toggle, and user profile avatar dropdown.
  - `AppSidebar`: Collapsible navigation for library shelves (Continue Reading, Finished, My Library, Favorites).
  - `MobileNav`: Responsive bottom bar or slide-out drawer for smartphone viewports.
  - `AppShell`: Persistent master layout container wrapping pages with header, sidebar, and main content area.
  - `Breadcrumb` and page title utility headers.
- [ ] **Extended Shared Primitives (`src/components/ui/`):**
  - Input, Label, DropdownMenu, Dialog (Modal), Tabs, Badge, Tooltip, Skeleton, Toast notifications.
- [ ] **Responsive Design Rules:**
  - Mobile breakpoint (< 768px): Collapsible drawer, single-column cards, full-width reader.
  - Tablet breakpoint (768px - 1024px): Compact sidebar, 2-column book grids.
  - Desktop breakpoint (> 1024px): Expanded navigation, multi-column grids, dual-page spread reader.

**Milestone:** Responsive application shell with theme switching, responsive navigation, and core component library rendered in isolation.  
**Acceptance Criteria:**
- Application shell adapts seamlessly across mobile (375px), tablet (768px), and desktop (1280px+).
- All shared primitives render consistently in light and dark modes with zero layout shift.

---

## Phase 3: Frontend Pages & Interactive Prototypes (Frontend-First)

### Objectives
Construct all key application screens, user workflows, and the Web PDF Reader using typed contracts, rich mock data, and a replaceable service layer—**without implementing backend business logic prematurely**.

### Tasks
- [ ] **Typed Contracts & Mock Data (`src/types/`, `src/services/mocks/`):**
  - Define complete TypeScript interfaces matching future backend DTOs:
    - `Book`, `BookDetail`, `BookUploadPayload`, `PublicationRequest`.
    - `ReadingProgress`, `Bookmark`, `Highlight`, `Note`, `ReaderPreferences`.
  - Create rich, realistic mock datasets for books, categories, progress, and annotations.
  - Implement a **replaceable service layer**:
    - `bookService.ts`: mock endpoints with simulated latency (`setTimeout`) for catalog, library, search, and details.
    - `progressService.ts`: mock save/load progress.
    - `annotationService.ts`: mock bookmark, highlight, and note CRUD.
    - `moderationService.ts`: mock submission and review queue.
  - Provide a visual `MockDataBadge` in development mode to clearly differentiate mock data from live backend data.
- [ ] **Discovery & Catalog Page (`/` / `/explore`):**
  - Hero banner, search bar with debounce, category/genre filter pills.
  - Book card grid (`src/components/books/BookCard.tsx`) with cover image, author, rating placeholder, and reading status badge.
  - Empty states, loading skeletons, and pagination controls.
- [ ] **Personal Library Pages (`/library`):**
  - Tabbed library views: Continue Reading, Finished Books, My Library, My Published Books, My Favourites.
  - Sorting (recently read, title, date added) and quick action menus (continue, remove, bookmark).
- [ ] **Book Detail Page / Modal (`/books/:id`):**
  - Cover preview, full metadata, synopsis, publication status badge, action buttons (Read Now, Add to Library, Publish Request).
- [ ] **Book Upload & Publish Dialogs (`src/components/books/`):**
  - Drag-and-drop PDF upload zone with client-side file size and format validation.
  - Metadata entry form (title, author, description, tags, license declaration).
  - Publication request dialog with terms and copyright confirmation.
- [ ] **Web PDF Reader UI (`/read/:bookId`):**
  - Integrate PDF.js with dedicated worker script.
  - Dual rendering modes: Single-page view and Double-page (book spread) view.
  - Navigation controls: vertical continuous scroll and horizontal page-flip stepping.
  - Viewport controls: zoom in/out, fit-to-width, fit-to-page, fullscreen toggle.
  - Reading progress bar with page number input jumper.
  - **Sample PDF Validation:** Validate reader layout, canvas scaling, and responsiveness using a real sample PDF binary bundled in `public/sample.pdf`.
- [ ] **Annotations & Bookmarks UI (`src/components/reader/`):**
  - Bookmark ribbon toggle and bookmark management panel (with color tags and custom labels).
  - Text selection toolbar with highlight color picker.
  - Slide-out annotations drawer showing bookmarks, highlights, and page-anchored notes.
- [ ] **Admin Moderation Queue Page (`/admin/moderation`):**
  - Queue listing pending publication requests.
  - Review drawer with book preview, license assertions, and Approve / Reject action modals with reviewer feedback.

**Milestone:** Fully navigable, interactive frontend prototype covering all core requirements, verified with a real sample PDF.  
**Acceptance Criteria:**
- All pages navigable without console errors; TypeScript strictly typed (zero `any`).
- Reader loads and renders `sample.pdf` accurately in single-page and double-page modes.
- Annotations and bookmarks can be created and manipulated in mock state.
- Responsive across all target breakpoints.

---

## Phase 4: Backend Business Development & Persistence Core

### Objectives
Implement backend business logic, database entities, file storage abstractions, and transactional services to fulfill the contracts established during the frontend phase.

### Tasks
- [ ] **Database Schema Migrations (Flyway):**
  - `V3__create_books_table.sql`: books table (UUID, uploader_id, title, author, description, storage_key, file_hash, file_size, page_count, cover_key, status, timestamps).
  - `V4__create_reading_progress_table.sql`: unique `(user_id, book_id)`, current_page, progress_percentage, is_finished, timestamps.
  - `V5__create_annotations_tables.sql`: bookmarks, bookmark_groups, highlights, notes.
  - `V6__create_publication_requests_table.sql`: book_id, requester_id, reviewer_id, status, reviewer_notes, timestamps.
- [ ] **File Storage Abstraction (`com.openshelf.storage`):**
  - `StorageService` interface with `LocalStorageServiceImpl` for local development.
  - Secure file path sanitization, SHA-256 deduplication hashing, and stream retrieval.
- [ ] **Backend Entities & Repositories:**
  - `Book`, `ReadingProgress`, `Bookmark`, `Highlight`, `Note`, `PublicationRequest`.
  - JPA repositories with ownership-scoped queries (`findByUserIdAndBookId`, etc.).
- [ ] **Business Services (`com.openshelf.service`):**
  - `BookService`: upload handling, metadata extraction (page count via PDFBox/Tika), private-by-default enforcement, deletion cascades.
  - `ReadingProgressService`: progress calculation, auto-finish triggers, continue-reading query.
  - `AnnotationService`: bookmark, highlight, and note operations with strict user ownership validation.
  - `PublicationService`: submit request, admin approve/reject workflow with status transitions.
- [ ] **REST Controllers (`com.openshelf.controller`):**
  - `BookController`, `ReadingProgressController`, `AnnotationController`, `PublicationController`.
  - HTTP Range streaming endpoint for PDF viewing (`GET /api/v1/books/{id}/stream`).

**Milestone:** All backend services, schema migrations, and REST controllers implemented and unit/integration tested.  
**Acceptance Criteria:**
- Flyway migrations execute cleanly from scratch on an empty PostgreSQL database.
- Private books and reading data strictly inaccessible to unauthorized users (HTTP 403 / 404).
- PDF streaming endpoint supports partial content (`HTTP 206 Partial Content`).
- Unit and integration tests pass with high branch coverage.

---

## Phase 5: API Integration & Replaceable Service Layer Swap

### Objectives
Connect the frontend components to the live Spring Boot REST APIs by swapping out mock services, verifying end-to-end data flow.

### Tasks
- [ ] **Service Layer Replacement:**
  - Transition `src/services/` from mock functions to actual Axios calls hitting `/api/v1/*`.
  - Implement environment toggle (`VITE_USE_MOCK_API=false`) allowing runtime fallback if needed.
- [ ] **TanStack Query Mutation Wiring:**
  - Connect upload form to `useMutation` calling `POST /api/v1/books`.
  - Connect reader progress sync to debounced `POST /api/v1/books/{id}/progress`.
  - Connect bookmark, highlight, and note creation to backend endpoints.
  - Invalidate relevant query caches upon successful mutations.
- [ ] **PDF Reader Live Streaming:**
  - Connect reader PDF.js document loader to authenticated streaming endpoint `/api/v1/books/{id}/stream`.
- [ ] **Publication Workflow Integration:**
  - User submission triggers real `POST /api/v1/books/{id}/publish`.
  - Admin moderation actions update live book status.
- [ ] **Error Handling & Feedback Polish:**
  - Map backend RFC 7807 error responses to frontend toast notifications and inline form errors.

**Milestone:** Complete frontend operating entirely on live PostgreSQL and Spring Boot data with mock data disabled.  
**Acceptance Criteria:**
- Real PDF upload stores binary in local storage, metadata in DB, and opens immediately in Web Reader.
- Reading progress persists across separate devices / browsers upon user login.
- Publication approval workflow updates public discovery catalog in real time.

---

## Phase 6: End-to-End Testing, Hardening & Polishing

### Objectives
Comprehensive verification across security, performance, cross-browser compatibility, and accessibility.

### Tasks
- [ ] **Automated Testing Suite:**
  - Backend integration tests using Spring Boot Test and Testcontainers.
  - Frontend component tests using Vitest and React Testing Library.
  - Critical path end-to-end tests (Register -> Upload -> Read -> Bookmark -> Publish -> Moderate).
- [ ] **Security & Authorization Audit:**
  - Verify IDOR protection: User A cannot fetch User B's private book or annotations.
  - Verify role protection: Non-admin cannot access `/api/v1/admin/**`.
  - File upload safety checks: reject non-PDF MIME types, enforce size caps.
- [ ] **Performance & Reader Optimization:**
  - Virtualized rendering for long PDF documents (500+ pages) to limit DOM memory usage.
  - Image optimization for book covers and avatars.
  - Lighthouse performance audit score >= 90.

**Milestone:** Hardened, production-ready codebase with zero security vulnerabilities and passing automated test suites.  
**Acceptance Criteria:**
- 100% automated regression test pass rate.
- Verified absence of access control vulnerabilities.

---

## Phase 7: Cloud Infrastructure, Production Deployment & Future Social Features

### Objectives
Production packaging, cloud storage integration, and community feature expansion.

### Tasks
- [ ] **Amazon S3 Integration:** Implement `S3StorageServiceImpl` with presigned upload/download URLs.
- [ ] **Production Docker Containers:** Multi-stage Dockerfiles for Spring Boot (distroless/JRE) and React (Nginx Alpine).
- [ ] **CI/CD Pipeline:** GitHub Actions workflow executing build, lint, backend tests, and Docker image publishing.
- [ ] **Future Social Expansion:** Book reviews, 5-star ratings, community collections, public user profiles.

**Milestone:** Live production deployment on cloud infrastructure.
