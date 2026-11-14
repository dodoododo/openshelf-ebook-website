# OpenShelf — System Architecture & Design

> **Authentication implemented (2026-11-12):** Phase 1 uses server-side sessions, HttpOnly cookies, Argon2id, and session-backed CSRF protection. See the [approved design](authentication-design.md) and [verification report](../development/phase-1-implementation.md). Public routes are method-specific; `/auth/me` requires authentication.

## 1. High-Level Architecture Overview

OpenShelf is structured as a **Monorepo with Traditional Layered Architecture**. The platform consists of a single-page React frontend, a RESTful Spring Boot 4.1.2 backend, a PostgreSQL 17 relational database, and an object storage tier for PDF binaries (local filesystem during development, Amazon S3 for production).

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Browser)"]
        UI["React 19 + Tailwind v4 + shadcn/ui"]
        State["TanStack Query (Server State)"]
        Router["React Router"]
        ServiceLayer["Service Layer (Replaceable Mock / Real)"]
        Axios["Axios API Client"]
    end

    subgraph Gateway["Vite Dev Server / Reverse Proxy"]
        Proxy["Proxy: /api, /actuator -> :8080"]
    end

    subgraph Backend["Spring Boot 4.1.2 Application (:8080)"]
        Security["Spring Security 7 (FilterChain)"]
        Controllers["Controllers (HTTP / REST)"]
        Services["Services (Business Logic & Transactions)"]
        Repositories["Repositories (Spring Data JPA)"]
        Flyway["Flyway Migration Engine"]
    end

    subgraph DataTier["Data & Storage Tier"]
        DB[(PostgreSQL 17 :5432)]
        Storage[("PDF Storage (Local FS / Amazon S3)")]
    end

    UI --> State
    UI --> Router
    State --> ServiceLayer
    ServiceLayer -. Mode: Mock .-> MockData[("Typed Mock Datasets")]
    ServiceLayer -. Mode: Real .-> Axios
    Axios --> Proxy
    Proxy --> Security
    Security --> Controllers
    Controllers --> Services
    Services --> Repositories
    Services --> Storage
    Repositories --> DB
    Flyway -. Migrations .-> DB
```

---

## 2. Layer Responsibilities & Boundaries

### 2.1 Frontend Responsibilities (React + TypeScript)
- **Presentation:** Render user interfaces using styled shadcn/ui components and Tailwind CSS v4 utility classes.
- **Client Routing:** Page navigation and URL synchronization via React Router.
- **Server State Management:** Asynchronous query fetching, caching, deduplication, and cache invalidation via TanStack Query.
- **Replaceable Service Abstraction:** Dedicated service modules (`src/services/`) decouple UI components from network transport, enabling rapid mock prototyping and seamless API integration.
- **Reader Engine:** High-performance PDF rendering using PDF.js inside a dedicated reader canvas layer.
- **Local Preferences:** Storing transient UI preferences (e.g. sidebar toggle, zoom setting).

### 2.2 Backend Responsibilities (Spring Boot + Java 21)
- **API Boundary:** Expose RESTful endpoints, perform Bean Validation, and map incoming JSON contracts.
- **Business Operations:** Enforce business invariants, privacy boundaries, publication workflows, and role checks.
- **Security & Authorization:** Server-side session authentication and CSRF protection, resource-level ownership verification, and security filter enforcement.
- **Data Persistence:** Relational data mapping, optimistic locking, and transaction boundaries.
- **Binary Streaming:** Chunked, stream-optimized delivery of PDF files with HTTP range header support.

---

## 3. Frontend-First Strategy & Replaceable Service Layer

OpenShelf uses a **Frontend-First development workflow after Authentication**. This decouples UI/UX exploration from backend schema finalization.

### 3.1 Replaceable Service Pattern
To enable full interactivity before backend endpoints are built:
1. **Contract First (`src/types/`):** All domain models (`Book`, `ReadingProgress`, `Bookmark`, etc.) are defined as strict TypeScript interfaces mirroring future backend DTO schemas.
2. **Service Abstraction (`src/services/`):** UI components invoke high-level service functions (e.g., `getBookCatalog()`, `saveProgress()`), never raw URLs or axios instances directly.
3. **Mock Data Layer (`src/services/mocks/`):** During Phase 3, services return typed mock data wrapped in Promises with simulated network latency:
   ```typescript
   export async function getBookCatalog(): Promise<ApiResponse<Book[]>> {
     if (isMockMode()) {
       await delay(300);
       return { success: true, data: MOCK_BOOKS, timestamp: new Date().toISOString() };
     }
     const response = await apiClient.get<ApiResponse<Book[]>>('/api/v1/books');
     return response.data;
   }
   ```
4. **Seamless Integration (Phase 5):** When backend endpoints are deployed, switching `VITE_USE_MOCK_API=false` redirects traffic to the Spring Boot REST API without modifying any page or component code.

### 3.2 Clear Mock vs. Integrated Differentiation
- Development builds display a persistent, non-intrusive `MockDataBadge` when mock services are active.
- Features backed by real backend APIs (such as Authentication in Phase 1) communicate directly with the live server.

### 3.3 Real PDF Validation in Prototyping
- The Web PDF Reader component must never rely on mocked canvas stubs.
- Reader UI, page-turning, dual-page layout, and zoom controls are validated against a real binary (`public/sample.pdf`) during the frontend phase.

**Milestone 1 implemented (2026-11-13):** `/read/:bookId` is protected by the existing session-aware route guard and sits outside `AppShell`. A lazy-loaded PDF.js reader renders only the active page/spread, with its installed worker emitted by Vite. `bookService.ts` supplies the original CC0 sample contract; `readingProgressService.ts` supplies browser-only, user/book/document-version-scoped progress with a memory fallback. Both are explicit mock services with `ApiResponse<T>` signatures. Authentication continues to use the live backend. No book/progress API, database migration, or mock/live API switch has been added. Browser keys are a prototype separation mechanism, not authorization. Details and remaining reader capabilities: [Reader specification](../design/reader-spec.md).

**Milestone 2:** The explicitly authorized upload/storage slice now integrates real books while retaining the sample demo. `/library` queries the session owner's real paginated library and uploads multipart PDFs through the existing Axios/CSRF transport. `bookService.ts` maps real private metadata into the existing reader contract; only ID `sample` uses mock metadata. PDF.js fetches the protected file endpoint with credentials and byte-range support. Progress remains browser-local, keyed by user/book/immutable file ID; there is no progress database table. Backend controller/service/repository/entity/DTO/mapper/storage layers remain separate. `StorageService` abstracts binaries; `LocalStorageService` uses a configurable absolute directory outside public assets. The V3 migration normalizes book metadata and immutable file versions. See [Milestone 2](../development/upload-milestone-2.md) for configuration, failure handling, and verification.

---

## 4. Strict Monorepo Layered Architecture

OpenShelf strictly prohibits package-by-feature or modular feature packaging. All code is grouped by technical responsibility.

### 4.1 Backend Package Organization
```text
com.openshelf/
├── OpenshelfApplication.java  # Application entrypoint
├── controller/                # REST Controllers (thin HTTP adapters)
├── service/                   # Business services & transaction boundaries
├── repository/                # Spring Data JPA repositories
├── entity/                    # JPA domain entities (not exposed to API)
├── dto/
│   ├── request/               # Inbound API payload contracts
│   └── response/              # Outbound API response models
├── mapper/                    # Entity <-> DTO conversion mappers
├── config/                    # Spring @Configuration classes
├── security/                  # Security filter chains, session authentication
├── exception/                 # Custom domain exceptions & @ControllerAdvice
├── storage/                   # Storage abstraction (Local & S3)
├── validation/                # Custom validation annotations & validators
├── enums/                     # Domain & status enumerations
└── util/                      # Shared static utilities
```

### 4.2 Frontend Folder-by-Type Structure
```text
frontend/src/
├── assets/                    # Static image/media assets
├── components/
│   ├── ui/                    # Base shadcn/ui components (Button, Card, etc.)
│   ├── layout/                # Shell, AppHeader, AppSidebar, MobileNav
│   ├── books/                 # Book cards, grid, upload modals
│   ├── reader/                # PDF viewer canvas, toolbar, annotations drawer
│   └── common/                # Shared UI dialogs, spinners, alerts, badges
├── pages/                     # Top-level page routes
├── services/                  # Replaceable API service calls and mock datasets
│   └── mocks/                 # Typed mock data records
├── hooks/                     # Custom React hooks
├── contexts/                  # React contexts (AuthContext, etc.)
├── providers/                 # React Context and Query providers
├── types/                     # Shared TypeScript interfaces & DTO contracts
├── utils/                     # Generic utility functions
├── lib/                       # shadcn helper utilities (cn)
├── routes/                    # Route declarations and ProtectedRoute
└── styles/                    # Global CSS and Tailwind directives
```

---

## 5. Backend Request Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Browser)
    participant Sec as SecurityFilterChain
    participant Ctrl as REST Controller
    participant Val as Bean Validation
    participant Svc as Service Layer
    participant Repo as JPA Repository
    participant DB as PostgreSQL 17

    User->>Sec: HTTP Request (Headers + Body)
    Sec->>Sec: Validate Session, CSRF & Roles
    Sec->>Ctrl: Dispatch to matching endpoint
    Ctrl->>Val: Validate @Valid DTO
    Val-->>Ctrl: DTO valid
    Ctrl->>Svc: Call service method with DTO
    Svc->>Svc: Execute business logic & ownership check
    Svc->>Repo: Query / Persist entity
    Repo->>DB: Execute SQL
    DB-->>Repo: SQL Result Set
    Repo-->>Svc: Managed Entity
    Svc->>Svc: Map Entity to Response DTO
    Svc-->>Ctrl: Return Response DTO
    Ctrl-->>User: HTTP 200/201 (JSON Contract)
```

---

## 6. Security Principles

1. **Deny by Default:** All endpoints require authenticated access except explicit public method/path rules: health GETs, `GET /api/v1/auth/csrf`, and POST registration/login/logout. `/api/v1/auth/me` requires authentication; `/api/v1/admin/**` requires ROLE_ADMIN. Public catalog access will be defined in its later phase.
2. **Resource Ownership Verification:** Every access to private books, bookmarks, highlights, or reading progress must explicitly assert that the resource belongs to the authenticated user ID (`owner_id == currentUser.id`).
3. **No Entity Leakage:** Internal JPA entities must never be returned directly in REST controllers. All API responses use explicit DTOs.
4. **Credential Isolation:** Database credentials are injected strictly via environment variables; never checked into version control.
