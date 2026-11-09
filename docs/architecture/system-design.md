# OpenShelf — System Architecture & Design

## 1. High-Level Architecture Overview

OpenShelf is structured as a **Monorepo with Traditional Layered Architecture**. The platform consists of a single-page React frontend, a RESTful Spring Boot 4.1.2 backend, a PostgreSQL 17 relational database, and an object storage tier for PDF binaries (local filesystem during development, Amazon S3 for production).

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Browser)"]
        UI["React 19 + Tailwind v4 + shadcn/ui"]
        State["TanStack Query (Server State)"]
        Router["React Router"]
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
    State --> Axios
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
- **Reader Engine:** High-performance PDF rendering using PDF.js inside a dedicated reader canvas layer.
- **Local Preferences:** Storing transient UI preferences (e.g. sidebar toggle, zoom setting).

### 2.2 Backend Responsibilities (Spring Boot + Java 21)
- **API Boundary:** Expose RESTful endpoints, perform Bean Validation, and map incoming JSON contracts.
- **Business Operations:** Enforce business invariants, privacy boundaries, publication workflows, and role checks.
- **Security & Authorization:** Token authentication, resource-level ownership verification, and security filter enforcement.
- **Data Persistence:** Relational data mapping, optimistic locking, and transaction boundaries.
- **Binary Streaming:** Chunked, stream-optimized delivery of PDF files with HTTP range header support.

---

## 3. Strict Monorepo Layered Architecture

OpenShelf strictly prohibits package-by-feature or modular feature packaging. All code is grouped by technical responsibility.

### 3.1 Backend Package Organization
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
├── security/                  # Security filter chains, token handlers
├── exception/                 # Custom domain exceptions & @ControllerAdvice
├── storage/                   # Storage abstraction (Local & S3)
├── validation/                # Custom validation annotations & validators
├── enums/                     # Domain & status enumerations
└── util/                      # Shared static utilities
```

### 3.2 Frontend Folder-by-Type Structure
```text
frontend/src/
├── assets/                    # Static image/media assets
├── components/
│   ├── ui/                    # Base shadcn/ui components (Button, Card, etc.)
│   ├── layout/                # Shell, Navbar, Sidebar, Footer
│   ├── books/                 # Book cards, grid, metadata displays
│   ├── reader/                # PDF viewer canvas, toolbar, navigation
│   └── common/                # Shared UI dialogs, spinners, alerts
├── pages/                     # Top-level page routes
├── services/                  # Axios HTTP client and API service calls
├── hooks/                     # Custom React hooks
├── contexts/                  # React contexts for cross-cutting state
├── providers/                 # React Context and Query providers
├── types/                     # Shared TypeScript interfaces & types
├── utils/                     # Generic utility functions
├── lib/                       # shadcn helper utilities (cn)
├── routes/                    # Route declarations
└── styles/                    # Global CSS and Tailwind directives
```

---

## 4. Backend Request Execution Flow

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
    Sec->>Sec: Validate Session / Token & Roles
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

## 5. Security Principles

1. **Deny by Default:** All endpoints require authenticated access except designated public routes (e.g. `/actuator/health`, `/api/auth/**`, public catalog queries).
2. **Resource Ownership Verification:** Every access to private books, bookmarks, highlights, or reading progress must explicitly assert that the resource belongs to the authenticated user ID (`owner_id == currentUser.id`).
3. **No Entity Leakage:** Internal JPA entities must never be returned directly in REST controllers. All API responses use explicit DTOs.
4. **Credential Isolation:** Database credentials and signing secrets are injected strictly via environment variables; never checked into version control.
