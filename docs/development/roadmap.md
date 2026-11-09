# OpenShelf — Development Roadmap & Implementation Phases

## Phase 0: Project Initialization & Architecture Setup (Current Phase)
- [x] Monorepo workspace initialization.
- [x] Docker Compose setup with PostgreSQL 17 Alpine and health checks.
- [x] Spring Boot 4.1.2 backend bootstrap with Java 21, Flyway, Spring Security, and Actuator.
- [x] React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui frontend bootstrap.
- [x] Central Axios client, TanStack Query provider, and Vite proxy configuration.
- [x] Comprehensive documentation suite and AI engineering guidelines (`AGENTS.md`).
- [x] Full-stack connectivity verification (`/actuator/health` passing end-to-end).

---

## Phase 1: Authentication & User Management
- [ ] User entity schema migration via Flyway (`users` table).
- [ ] Password hashing via BCrypt and JWT security integration.
- [ ] User registration, login, token refresh, and profile endpoints.
- [ ] Frontend authentication forms (Login, Register, Profile) using React Hook Form & Zod.
- [ ] Auth context and protected routes.

---

## Phase 2: Core Book Management & Storage
- [ ] Local storage service abstraction for PDF uploads.
- [ ] Book database schema (`books` table) with privacy status enums.
- [ ] Backend file upload endpoint with MIME validation and page count extraction.
- [ ] Private library catalog endpoints (My Library).
- [ ] Frontend book upload dialog and book listing cards.

---

## Phase 3: Web PDF Reader Engine
- [ ] PDF.js worker integration in React.
- [ ] Single-page and two-page canvas renderers.
- [ ] Zoom controls, fullscreen mode, and scroll/turn navigation.
- [ ] Virtualized page viewport for high-performance memory management.
- [ ] Backend streaming endpoint with HTTP Range header support.

---

## Phase 4: Reading Data & Personal Annotations
- [ ] Reading progress tracking schema (`reading_progress` table) and automatic debounce sync.
- [ ] Continue Reading shelf on dashboard.
- [ ] Custom bookmarks with color tags and organization groups.
- [ ] Text selection, highlight persistence, and personal notes.
- [ ] Reader preferences persistence (layout, zoom, theme).

---

## Phase 5: Publishing Workflow & Moderation
- [ ] Publication request schema and status transitions (`PENDING_REVIEW`, `PUBLIC`, `REJECTED`).
- [ ] User submission flow for publication requests.
- [ ] Admin moderation dashboard to review and approve/reject submissions.
- [ ] Public book discovery, search, and category filtering.

---

## Phase 6: Cloud Infrastructure & Social Features (Future)
- [ ] Amazon S3 storage integration.
- [ ] Book ratings, written reviews, and user discussion threads.
- [ ] Docker production images and GitHub Actions CI/CD workflows.
