# OpenShelf — Current Engineering State

**Last Updated:** Phase 0 (Bootstrap Completion)

---

## 1. Current Development Phase
- **Active Phase:** Phase 0 — Full-Stack Project Initialization & Engineering Setup
- **Status:** Complete & Fully Verified

---

## 2. Completed Work

### 2.1 Repository & Environment
- Established monorepo root structure with `frontend/`, `backend/`, `docs/`, `scripts/`, `.github/workflows/`.
- Configured `.gitignore` covering Windows, IDEs, build artifacts, and secrets.
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

## 4. Known Issues & Minor Observations
- JDK 23 is the primary system JDK; compilation compiles cleanly for Java 21 bytecode via Maven `--release 21`. If a native Java 21 JDK is desired side-by-side, it can be installed via `winget install EclipseAdoptium.Temurin.21.JDK`.
- In PowerShell, run commands using `.cmd` extensions (e.g. `npm.cmd`, `docker.exe`) to bypass Windows PowerShell execution policy or broken System32 stubs.

---

## 5. Pending Decisions
- Finalize JWT authentication claim structure (sub, email, roles, expiration) for Phase 1.
- Choose between local filesystem storage vs MinIO for local S3 simulation in Phase 2.

---

## 6. Recommended Next Task
**Phase 1 — Task 1: Database Schema Migration for User Accounts & Authentication Foundation**
- Define `users` table Flyway migration (`V2__create_users_table.sql`).
- Implement User entity, repository, and DTOs.
- Implement BCrypt password encoding and Spring Security UserDetailsService / JWT filter.
