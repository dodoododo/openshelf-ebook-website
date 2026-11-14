# Phase 1 — Authentication Implementation and Verification

**Completed:** 2026-11-12  
**Scope:** Registration, login, session restoration, current-user profile, logout, and authorization foundations. Phase 2 has not started.

## Implemented Behavior

The backend remains organized under `controller`, `service`, `repository`, `entity`, `dto/request`, `dto/response`, `mapper`, `security`, `config`, `exception`, `enums`, `util`, and `validation`. Frontend files remain grouped by technical role; no `features/` directories or business feature APIs were introduced.

Spring Security uses an explicit `AuthenticationManager` and Argon2id provider. JSON login invokes the session strategy to rotate the ID and clear the old CSRF token, creates a security context, and saves it through a shared `SecurityContextRepository` before responding. The persisted principal contains identity and authorities, with credential material erased; entities never cross the API boundary.

The production cookie is `__Host-openshelf-session`, host-only, Path=/, HttpOnly, Secure, SameSite=Lax, with no persistent cookie lifetime. Local HTTP uses `openshelf-session` with Secure disabled only in the local profile. Idle timeout is 30 minutes and URL session tracking is disabled. Spring logout handlers clear authentication, invalidate the server session and CSRF token, and expire the matching cookie. HTTP Basic, generated login forms, and REST request caching are disabled.

CSRF uses `HttpSessionCsrfTokenRepository` and Spring's XOR-aware request handler. The public CSRF endpoint materializes a masked token; React retains it in memory, attaches X-CSRF-TOKEN to unsafe requests, and fetches a new token after login/logout. A CSRF failure refreshes the token and requires explicit user resubmission. Unsafe requests are never automatically replayed. The API client rejects arbitrary destinations before attaching credentials or CSRF values.

TanStack Query owns the current user. AuthContext exposes derived state/actions, while ProtectedRoute waits for restoration and distinguishes anonymous users from server/network failure. Private queries are canceled and removed on logout, successful account changes, and session checks discovering expiry or another identity. Forms use the existing Button/Card primitives, accessible labels/errors, and loading states. The protected `/account` page only displays identity and offers logout.

## Database Migration

`V2__create_users_table.sql` creates `users` with application-generated UUIDs, unique normalized email, a 255-character encoded hash field, display name, ROLE_USER/ROLE_ADMIN constraint, and UTC timestamps. Registration strips/lowercases ASCII email addresses with Locale.ROOT and always assigns ROLE_USER. Unknown JSON fields are rejected. The named unique constraint handles concurrent duplicates; error mapping occurs after transaction rollback.

Argon2id uses 19,456 KiB memory, 2 iterations, parallelism 1, a 16-byte salt, and a 32-byte hash. Bouncy Castle 1.86 is configured, and stored hashes include the encoder identifier. Registration accepts 15–128 Unicode code points without trimming or normalizing passwords. Hashes and plaintext credentials are excluded from responses and DTO logging. Auth JSON bodies are bounded to 8 KiB, including chunked input.

V1 remains byte-identical and has Flyway checksum `1233558564`. Migration tests cover fresh V1+V2, upgrading V1 while preserving sentinel data/history, and rejecting an unmanaged non-empty schema with automatic baselining disabled. `ddl-auto` stays `validate`; no Flyway clean/reset/repair/baseline operation was used.

The existing development database was not migrated or written to during verification. Its normalized logical dump SHA-256 remains `A8FF402746F274810F42EFE11921DEF27F67EC1B0D4B15AEA8AC9BF016B8E261`. V2 will apply when the user next starts the normal backend. All integration and browser test writes used disposable PostgreSQL 17 containers.

## API Contracts

All application endpoints have prefix `/api/v1`; successful user responses use `{ success: true, data: User, timestamp }`. User contains `id`, `email`, `displayName`, `role`, `createdAt`, and `updatedAt`; no hash, password, session ID, or JWT is returned.

- `GET /auth/csrf`: public, 200; `data` contains `headerName: "X-CSRF-TOKEN"` and the masked `token`.
- `POST /auth/register`: JSON `{ email, password, displayName }`, valid CSRF required, 201 with User. Does not authenticate the new account. Duplicate normalized email returns 409 `EMAIL_ALREADY_EXISTS`.
- `POST /auth/login`: JSON `{ email, password }`, valid CSRF required, 200 with User and a rotated session cookie. Incorrect password/unknown email return the same 401 `INVALID_CREDENTIALS` response.
- `GET /auth/me`: authenticated, 200 with current User; otherwise 401 `UNAUTHENTICATED`. A deleted user invalidates the session.
- `POST /auth/logout`: valid CSRF required, 204 with no body; invalidates session and expires the cookie. An anonymous session with a valid token may also log out. GET never logs out.

Errors use the existing `{ success: false, error: { code, message, status, details }, timestamp }` envelope. Validation is 400, malformed/unknown fields 400, missing/invalid CSRF 403, insufficient privileges 403, oversized credential bodies 413, non-JSON credentials 415, and throttling 429 with Retry-After. Both controller advice and security-filter errors follow the envelope. Auth responses are no-store.

Only explicit health/CSRF GETs and registration/login/logout POSTs are public. `/auth/me` is protected; `/api/v1/admin/**` requires ROLE_ADMIN. USER cannot access administration. Admin principals receive both USER and ADMIN authorities; public registration cannot select either authority. No admin management API or default admin credentials were added.

Credential throttles use bounded expiring counters: 10 login attempts/email and 30/IP per 15 minutes, registration 5/IP/hour, with a 10,000-key bound. Limits are configurable through `openshelf.auth.*` properties and never create permanent account lockouts. They use the socket peer address, not arbitrary forwarded headers.

## Executed Verification

- `powershell -ExecutionPolicy Bypass -File scripts\test-backend.ps1`: **19 passed, 0 failures, 0 errors, 0 skipped**, Maven total 1:19. Testcontainers 2.0.5/PostgreSQL 17; Java 23.0.1 compiled with release 21. The helper forces the test profile, avoids `.env`, and propagates Maven status; an intermediate failing suite returned 1 and the final suite returned 0.
- Backend suite breakdown: AuthIntegrationTests 11, CredentialThrottleTests 2, MigrationTests 3, OpenshelfApplicationTests 1, ProductionCookieTests 1, ThrottleHttpTests 1. Real HTTP tests verify cookies, session rotation/persistence, stale IDs, GET logout safety, logout deletion, and unauthorized replay. Production defaults are checked for Secure/HttpOnly/SameSite, cookie-only tracking, and 30-minute timeout.
- `npm.cmd run test:types`: passed, including application, test, and test configuration TypeScript.
- `npm.cmd test`: **19 passed** in 3 files. Covers session restoration/loading/retry, cache privacy, registration validation, credential failures, explicit resubmission, CSRF lifecycle, and destination restrictions.
- `npm.cmd run build`: passed.
- `npm.cmd run lint`: exit 0; one existing Fast Refresh export warning in `src/components/ui/button.tsx`. No new auth lint warning remains.
- `npm.cmd run test:e2e`: final run **2 passed in 21.1 seconds** in Microsoft Edge through Vite and an isolated backend. Verified register → login → reload → current user → logout → protected route denied, cookie HttpOnly/SameSite and ID rotation, CSRF rejection, no credentials in browser storage, and mobile form validation/overflow. Earlier reruns exposed localhost/readiness delays; the harness now uses explicit loopback addresses and a bounded readiness check, with test retries disabled.
- V1 file SHA-256 remains `E9D27011048DE4F32A899903BCC38BC6EA96093D16A97756D7E545F317247498`; existing development database logical checksum matches the earlier review. No commit or push was performed.

## Reproducing the Browser Checks

With Docker Desktop running, start this isolated test backend in one terminal from `backend/`:

```powershell
.\mvnw.cmd test-compile spring-boot:test-run "-Dspring-boot.run.main-class=com.openshelf.BrowserTestApplication"
```

It uses port 18080 and a disposable database, never `.env` or the Compose volume. In another terminal, from `frontend/`:

```powershell
npm.cmd run test:e2e
```

Playwright starts Vite on port 5174 with its proxy targeting 18080, or reuses an existing server at that URL locally. Windows uses installed Edge; other platforms use Playwright Chromium (`npx playwright install chromium` if needed). Stop the isolated backend after checking; Testcontainers removes its database on exit. Normal development remains on ports 8080/5173 using the existing run scripts.

## Limitations and Next Phase

- Sessions and throttle counters live in one backend's memory and are lost on restart. No persistent/clustered sessions, remember-me, or cross-origin browser deployment is implemented.
- Deploy with the production profile behind a same-origin HTTPS proxy. Cookie attributes are verified, but a deployed HTTPS/TLS environment was not exercised. Configure trusted proxy/client-IP handling for the deployment before relying on per-client rate limits; otherwise the proxy is seen as the peer.
- Duplicate-email 409 intentionally reveals account existence, as approved. Recovery/change-password, email verification, MFA, profile editing, admin provisioning/management, and role-change session revocation are separate work to evaluate before public production launch.
- Maven still emits non-failing external Flyway/Redgate metadata HTTP 401 and Mockito/JVM dynamic-agent warnings; the existing Button Fast Refresh warning remains. Browser tooling may emit a harmless NO_COLOR/FORCE_COLOR warning.
- Recommend moving to **Phase 2: UI/UX Design System & Application Layout** when requested. No Phase 2 implementation, books, uploads, reader, library, bookmarks, annotations, publishing, or social functionality was added.

## Files Created and Modified

Created files:

- `backend/src/main/java/com/openshelf/config/AuthConfiguration.java`
- `backend/src/main/java/com/openshelf/controller/AuthController.java`
- `backend/src/main/java/com/openshelf/dto/request/LoginRequest.java`
- `backend/src/main/java/com/openshelf/dto/request/RegisterRequest.java`
- `backend/src/main/java/com/openshelf/dto/response/ApiErrorResponse.java`
- `backend/src/main/java/com/openshelf/dto/response/ApiResponse.java`
- `backend/src/main/java/com/openshelf/dto/response/CsrfResponse.java`
- `backend/src/main/java/com/openshelf/dto/response/UserResponse.java`
- `backend/src/main/java/com/openshelf/entity/User.java`
- `backend/src/main/java/com/openshelf/enums/Role.java`
- `backend/src/main/java/com/openshelf/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/openshelf/exception/RateLimitException.java`
- `backend/src/main/java/com/openshelf/exception/UnauthenticatedException.java`
- `backend/src/main/java/com/openshelf/mapper/UserMapper.java`
- `backend/src/main/java/com/openshelf/repository/UserRepository.java`
- `backend/src/main/java/com/openshelf/security/AuthRequestFilter.java`
- `backend/src/main/java/com/openshelf/security/CredentialThrottle.java`
- `backend/src/main/java/com/openshelf/security/JsonSecurityErrors.java`
- `backend/src/main/java/com/openshelf/security/OpenShelfPrincipal.java`
- `backend/src/main/java/com/openshelf/security/OpenShelfUserDetailsService.java`
- `backend/src/main/java/com/openshelf/security/SessionLogin.java`
- `backend/src/main/java/com/openshelf/service/AuthService.java`
- `backend/src/main/java/com/openshelf/util/EmailAddress.java`
- `backend/src/main/java/com/openshelf/validation/PasswordLength.java`
- `backend/src/main/java/com/openshelf/validation/PasswordLengthValidator.java`
- `backend/src/main/resources/db/migration/V2__create_users_table.sql`
- `backend/src/test/java/com/openshelf/AuthIntegrationTests.java`
- `backend/src/test/java/com/openshelf/BrowserTestApplication.java`
- `backend/src/test/java/com/openshelf/CredentialThrottleTests.java`
- `backend/src/test/java/com/openshelf/MigrationTests.java`
- `backend/src/test/java/com/openshelf/PostgresIntegrationTest.java`
- `backend/src/test/java/com/openshelf/ProductionCookieTests.java`
- `backend/src/test/java/com/openshelf/ThrottleHttpTests.java`
- `backend/src/test/resources/application-test.yml`
- `docs/architecture/authentication-design.md`
- `docs/development/phase-1-implementation.md`
- `frontend/playwright.config.ts`
- `frontend/src/components/common/AuthForm.tsx`
- `frontend/src/components/common/SessionStatus.tsx`
- `frontend/src/contexts/AuthContext.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/hooks/useCurrentUser.ts`
- `frontend/src/pages/AccountPage.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/providers/AuthProvider.tsx`
- `frontend/src/routes/ProtectedRoute.tsx`
- `frontend/src/services/authService.ts`
- `frontend/src/types/api.ts`
- `frontend/src/types/auth.ts`
- `frontend/src/utils/apiErrors.ts`
- `frontend/src/utils/authValidation.ts`
- `frontend/tests/authClient.test.ts`
- `frontend/tests/authFlow.test.tsx`
- `frontend/tests/authValidation.test.ts`
- `frontend/tests/e2e/auth.spec.ts`
- `frontend/tests/setup.ts`
- `frontend/tsconfig.test.json`
- `frontend/vitest.config.ts`

Modified tracked files (including the preceding approved cleanup):

- `.gitignore`
- `backend/pom.xml`
- `backend/src/main/java/com/openshelf/security/SecurityConfig.java`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-local.yml`
- `backend/src/test/java/com/openshelf/OpenshelfApplicationTests.java`
- `docs/architecture/api-conventions.md`
- `docs/architecture/database-design.md`
- `docs/architecture/system-design.md`
- `docs/development/current-state.md`
- `docs/development/roadmap.md`
- `docs/development/setup-guide.md`
- `docs/product/requirements.md`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/App.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/routes/index.tsx`
- `frontend/src/services/apiClient.ts`
- `frontend/vite.config.ts`
- `README.md`
- `scripts/test-backend.ps1`
