# OpenShelf — Local Development Setup Guide

## 1. Prerequisites

Ensure the following tools are installed on your Windows 10/11 development machine:
- **Node.js:** v22.x or later (includes npm)
- **Git:** v2.4x or later
- **Docker Desktop:** With working Linux engine and Docker Compose v2.x
- **Java JDK:** Java 21 LTS (or JDK 23 with `--release 21` compilation support)
- **IDEs:** VS Code (recommended for `frontend/`) and IntelliJ IDEA (recommended for `backend/`)

---

## 2. Environment Configuration

1. Clone or open the repository root:
   ```powershell
   cd "D:\Microsoft VS Code\Web Projects\openshelf-ebook-website"
   ```
2. Prepare your `.env` file from the template:
   ```powershell
   Copy-Item .env.example .env
   ```
   > [!NOTE]
   > During project initialization, a secure local password is automatically generated in `.env`. Ensure this file is never committed.

---

## 3. Starting the Services

### Step 1: Start PostgreSQL via Docker Compose
```powershell
docker.exe compose up -d
```
Verify the container status:
```powershell
docker.exe compose ps
```
The database runs on `127.0.0.1:5432` with database name `openshelf_db` and user `openshelf`.

### Step 2: Start Spring Boot Backend
You can launch the backend using the provided helper script, which automatically injects `.env` variables into the process without modifying system environment:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-backend.ps1
```
Alternatively, from the `backend/` directory:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
Backend will be reachable at: `http://localhost:8080`.
Verify backend health: `http://localhost:8080/actuator/health`.

### Step 3: Start React Frontend
In a separate terminal:
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
Frontend development server will be reachable at: `http://localhost:5173`.
Vite automatically proxies:
- `/api/*` -> `http://localhost:8080/api/*`
- `/actuator/*` -> `http://localhost:8080/actuator/*`

---

## 4. IntelliJ IDEA Backend Configuration

To run and debug the Spring Boot backend directly inside IntelliJ IDEA:

1. Open IntelliJ IDEA and select **Open** -> Navigate to the `backend/` folder (or project root and import `backend/pom.xml`).
2. Ensure **Project SDK** is set to JDK 21 (or JDK 23 with Language level 21).
3. Create a **Spring Boot Run Configuration**:
   - **Main class:** `com.openshelf.OpenshelfApplication`
   - **Active profiles:** `local`
   - **Environment variables:**
     ```text
     POSTGRES_DB=openshelf_db;POSTGRES_USER=openshelf;POSTGRES_PASSWORD=<your_password_from_env>;POSTGRES_HOST=127.0.0.1;POSTGRES_PORT=5432
     ```
   - Alternatively, install the **EnvFile** plugin in IntelliJ to automatically load the root `.env` file into the run configuration.

---

## 5. Verification Commands

Run backend automated tests with Docker Desktop running. Tests use disposable PostgreSQL 17 Testcontainers on dynamic ports, force the `test` profile, and never load `.env` or connect to the Compose database. The helper propagates Maven failures:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-backend.ps1
```

Run frontend build and lint:
```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
```

Run frontend unit tests and test/config TypeScript checks:

```powershell
npm.cmd run test:types
npm.cmd test
```

For the isolated full-stack browser test server and `npm.cmd run test:e2e`, follow [the Phase 1 reproduction instructions](phase-1-implementation.md#reproducing-the-browser-checks). These use backend port 18080, frontend port 5174, and disposable data. Normal development uses 8080/5173. The next normal backend startup will apply forward migration V2 to create users without modifying V1 or resetting data.
