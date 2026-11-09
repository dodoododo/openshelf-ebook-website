# OpenShelf — Digital Library & Social Reading Platform

OpenShelf is a modern full-stack web application where readers can discover, upload, read, organize, annotate, and share books in a distraction-free, responsive environment.

---

## 1. Technology Stack

### Frontend
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS v4 & shadcn/ui
- **Routing:** React Router v7
- **HTTP Client:** Axios
- **Server State:** TanStack Query v5

### Backend
- **Platform:** Java 21 LTS
- **Framework:** Spring Boot 4.1.2 & Spring Framework 7
- **Security:** Spring Security 7
- **Persistence:** Spring Data JPA / Hibernate
- **Database Migrations:** Flyway (with `flyway-database-postgresql`)
- **Monitoring:** Spring Boot Actuator
- **Build Tool:** Maven 3.10 with Maven Wrapper

### Database & Infrastructure
- **Database:** PostgreSQL 17 (Docker Compose)
- **Containerization:** Docker Desktop & Docker Compose v2

---

## 2. Architecture Overview

OpenShelf is built as a **Monorepo with Traditional Layered Architecture**. The codebase is structured strictly by technical responsibility:
- **Backend:** Package-by-layer (`controller`, `service`, `repository`, `entity`, `dto`, `security`, `config`, etc.).
- **Frontend:** Folder-by-type (`components/`, `pages/`, `services/`, `hooks/`, `providers/`, `types/`, `routes/`, `styles/`).

> [!IMPORTANT]
> Reorganizing the project into feature modules or vertical domain slices is strictly prohibited. Refer to [AGENTS.md](AGENTS.md) for architectural rules.

---

## 3. Repository Structure

```text
openshelf-ebook-website/
├── frontend/             # React + TypeScript + Vite + Tailwind v4 + shadcn/ui
├── backend/              # Spring Boot 4.1.2 API + Maven Wrapper
├── docs/                 # Comprehensive documentation suite
│   ├── product/          # Product overview, requirements, business rules
│   ├── architecture/     # System design, database design, API conventions
│   ├── design/           # PDF Reader specifications
│   └── development/      # Roadmap, setup guide, current state
├── scripts/              # Windows PowerShell local development helpers
├── .github/              # GitHub Actions CI/CD workflows (future)
├── AGENTS.md             # AI coding agent operational guidelines
├── README.md             # Project overview & quick start
├── .gitignore            # Git exclusion rules
├── .env.example          # Environment variable template
├── .env                  # Local secrets (never committed)
└── compose.yaml          # PostgreSQL 17 Alpine Docker Compose
```

---

## 4. Local Development Quick Start

### 4.1 Prerequisites
- Windows 10/11
- Node.js 22.x & npm
- Docker Desktop (running Linux engine)
- Java JDK 21 LTS (or JDK 23 with `--release 21` compilation)

### 4.2 Start Services

#### 1. PostgreSQL (Docker Compose)
```powershell
docker.exe compose up -d
```
Container `openshelf-db` starts on `127.0.0.1:5432`.

#### 2. Spring Boot Backend
```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-backend.ps1
```
Runs on `http://localhost:8080`.
Health endpoint: `http://localhost:8080/actuator/health`.

#### 3. React Frontend
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
Runs on `http://localhost:5173`.
Vite dev server proxies `/api` and `/actuator` to the backend.

---

## 5. Application URLs

| Service | Local URL | Description |
| :--- | :--- | :--- |
| **Frontend Application** | [http://localhost:5173](http://localhost:5173) | Vite dev server with proxy |
| **Backend API** | [http://localhost:8080](http://localhost:8080) | Spring Boot REST service |
| **Backend Health Check** | [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) | Direct Actuator health probe |
| **Proxied Health Check** | [http://localhost:5173/actuator/health](http://localhost:5173/actuator/health) | Frontend proxy health check |
| **PostgreSQL Database** | `127.0.0.1:5432` | Database `openshelf_db` |

---

## 6. Project Documentation

Detailed project documentation is available in the `docs/` folder:
- [Product Overview](docs/product/overview.md)
- [Product Requirements (PRD)](docs/product/requirements.md)
- [Business Rules](docs/product/business-rules.md)
- [System Architecture](docs/architecture/system-design.md)
- [Database Design](docs/architecture/database-design.md)
- [API Conventions](docs/architecture/api-conventions.md)
- [Coding Conventions](docs/architecture/coding-conventions.md)
- [PDF Reader Specification](docs/design/reader-spec.md)
- [Development Roadmap](docs/development/roadmap.md)
- [Local Setup Guide](docs/development/setup-guide.md)
- [Current Engineering State](docs/development/current-state.md)

---

## 7. Current Development Status

- **Phase:** Phase 0 — Full-Stack Project Initialization & Engineering Setup (Completed)
- **Status:** All layers verified and running (PostgreSQL 17, Spring Boot 4.1.2, React 19).
- **Next Step:** Phase 1 — User Authentication & Account Foundation.
