# AGENTS.md — AI Engineering Guidelines & Operational Rules

> **MANDATORY INSTRUCTIONS FOR ALL AI CODING AGENTS WORKING ON OPENSHELF**

You are acting as an engineer on the **OpenShelf** repository. You must adhere strictly to the engineering rules, architectural patterns, and quality gates established below.

---

## 1. Core Architectural Mandates

1. **Backend Uses Layered Architecture:**
   All backend code in `backend/src/main/java/com/openshelf/` MUST be organized strictly by technical layer (`controller`, `service`, `repository`, `entity`, `dto/request`, `dto/response`, `mapper`, `config`, `security`, `exception`, `storage`, `validation`, `enums`, `util`).
2. **Frontend Uses Folder-by-Type Architecture:**
   All frontend code in `frontend/src/` MUST be grouped strictly by technical role (`components/`, `pages/`, `services/`, `hooks/`, `contexts/`, `providers/`, `types/`, `utils/`, `lib/`, `routes/`, `styles/`).
3. **DO NOT REORGANIZE INTO FEATURE MODULES:**
   Never introduce `features/` directories, package-by-feature structures, or vertical domain slices. Any restructuring toward feature packaging violates the project charter.

---

## 2. Engineering & Operational Rules

4. **Read Documentation Before Implementation:**
   Always review the relevant documents under `docs/` before implementing or modifying architecture.
   - Product requirements: [requirements.md](docs/product/requirements.md)
   - Business rules & permissions: [business-rules.md](docs/product/business-rules.md)
   - System design & request flow: [system-design.md](docs/architecture/system-design.md)
   - Database design: [database-design.md](docs/architecture/database-design.md)
   - API standards & DTO contracts: [api-conventions.md](docs/architecture/api-conventions.md)
   - Coding conventions: [coding-conventions.md](docs/architecture/coding-conventions.md)
   - Reader specifications: [reader-spec.md](docs/design/reader-spec.md)
   - Development roadmap: [roadmap.md](docs/development/roadmap.md)
   - Current status: [current-state.md](docs/development/current-state.md)
5. **Follow the Frontend-First Workflow Strategy:**
   - Complete **Authentication & User Management** first (Phase 1).
   - After Authentication, prioritize **UI/UX design system** and **frontend implementation** (Phase 2 & Phase 3).
   - Build main application layouts, pages, navigation, shared components, and interactive prototypes frontend-first using typed mock data and a replaceable service layer (`src/services/`) before implementing backend business features.
   - Define preliminary TypeScript contracts (`src/types/`) as the single source of truth for future API expectations.
   - Clearly distinguish mock functionality from fully integrated functionality (e.g., via visual indicators or mock mode toggles).
6. **Do Not Implement Backend Business Features Prematurely:**
   Do not create backend business entities, services, repositories, controllers, or Flyway migrations for books, reader progress, bookmarks, highlights, or publication requests while frontend prototyping is underway.
7. **Validate PDF Reader with Real Sample PDF:**
   The Web PDF Reader component must load and render an actual PDF binary (`public/sample.pdf`) with single-page, dual-page spread, zoom, and text-selection overlay verified before declaring its UI complete.
8. **Inspect Existing Code Before Changing It:**
   Inspect existing patterns, naming conventions, imports, and utility functions before creating new classes or components.
9. **Implement One Scoped Task at a Time:**
   Do not mix unrelated refactorings or jump ahead to unrequested features. Complete small, cohesive, testable increments.
10. **Avoid Overengineering:**
    Do not introduce unneeded design patterns, reactive streams where MVC suffices, microservices, Kafka, Redis, or speculative abstractions. Keep code simple and direct.
11. **Use DTOs and Request Validation:**
    Never expose JPA entities across REST API boundaries. Always use dedicated Request DTOs with Jakarta Bean Validation annotations and Response DTOs.
12. **Enforce Authorization for Private Resources:**
    Always verify resource ownership on user data (`user_id = authenticated_user.id`). User reading progress, bookmarks, highlights, and notes must remain strictly private.
13. **Use Flyway for Schema Migrations:**
    Never use `spring.jpa.hibernate.ddl-auto=update` or `create`. All database modifications must be written as forward Flyway SQL migration scripts under `backend/src/main/resources/db/migration/`.
14. **Follow Spring Boot 4.1-Compatible Practices:**
    Use `spring-boot-starter-webmvc`, Spring Security 7 functional filter chain definitions, and compatible dependencies.
15. **Run Tests and Builds After Changes:**
    After making code changes, run automated tests:
    - Backend: `powershell -ExecutionPolicy Bypass -File scripts\test-backend.ps1`
    - Frontend: `cd frontend && npm.cmd run build && npm.cmd run lint`
16. **Never Claim Unexecuted Tests Passed:**
    Report only verified test executions. If a test or command cannot be run, clearly state the blocker.
17. **Keep Documentation Synchronized with Implementation:**
    Whenever you complete a task or change an architecture decision, update [current-state.md](docs/development/current-state.md) and related docs.
18. **Never Commit Secrets or Private Uploaded Content:**
    Never commit `.env` files, passwords, API keys, private tokens, or uploaded PDF binaries to git.
