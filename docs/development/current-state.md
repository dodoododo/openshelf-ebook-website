# OpenShelf — Current Engineering State

**Last Updated:** Workflow Realignment (Frontend-First after Authentication)

---

## 1. Current Development Phase
- **Active Phase:** Phase 1 — Full-Stack Authentication & User Management
- **Workflow Strategy:** Frontend-First Development after Authentication
  - *Rationale:* User authentication establishes the identity foundation. Following authentication, all layouts, pages, interactive prototypes, and the Web PDF Reader will be built frontend-first using typed mock contracts before implementing backend business logic. This guarantees UI ergonomics and API expectation stability before database schemas are locked down.
- **Status:** Phase 0 Bootstrap Audit Complete & Verified. Phase 1 ready to commence.

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

## 3. Verified Functionality

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

## 5. Recommended Next Task

**Phase 1: Full-Stack Authentication & User Management**
1. Backend: Flyway migration `V2__create_users_table.sql` and `User` entity / `UserRepository`.
2. Backend: `BCryptPasswordEncoder`, `JwtService`, and `JwtAuthenticationFilter`.
3. Backend: `AuthController` (`/register`, `/login`, `/me`) and validation handling.
4. Frontend: Auth context (`AuthContext`), token storage, and responsive Login / Register forms.
5. Verification: End-to-end user registration and login flow.
