# Phase 1 Authentication — Approved Design

**Review date:** 2026-11-12  
**Status:** Approved and implemented on 2026-11-12. See the [implementation and verification report](../development/phase-1-implementation.md) for executed checks, file inventory, and limitations.  
**Scope:** Registration, login, current-user retrieval, logout, session restoration after a page refresh, and role enforcement. Backend remains layered; frontend remains folder-by-type.

## 1. Repository Findings and Decision

Before Phase 1, the application was a bootstrap: `SecurityConfig` permitted health checks, required authentication elsewhere, and enabled HTTP Basic with a generated development user. There were no application user entities or auth endpoints; the only backend test was `contextLoads()`. Phase 1 replaces that bootstrap authentication with the design below.

The previous Phase 1 roadmap specified BCrypt, JWT creation/filtering, Bearer headers, and localStorage or in-memory token storage, but did not define logout, refresh-token rotation, revocation, CSRF, cookie policy, or token lifetime. `current-state.md` repeated that plan. The system-design document also used token-oriented wording and an overly broad example of public `/auth/**` access. Those are design gaps, not implemented behavior.

**Approved implementation:** Spring Security's server-side `HttpSession` authentication and an opaque HttpOnly session cookie. React and `/api` use one browser origin, through the Vite proxy locally and an HTTPS reverse proxy in production. A session-backed CSRF token is returned by `GET /api/v1/auth/csrf`.

This recommendation follows from OpenShelf's current deployment shape: one browser client, one Spring MVC application, PostgreSQL, and no independent API consumers or distributed token-verification requirement.

### Session authentication compared with JWT

- **Browser storage:** A session needs only a browser-managed opaque cookie. A Bearer JWT in localStorage is readable by injected JavaScript; keeping it in memory requires a separate restoration/refresh mechanism. An HttpOnly JWT cookie avoids JavaScript access but still needs CSRF protection.
- **Logout and expiration:** A session can be invalidated immediately on the server. A self-contained JWT remains usable until expiration unless a revocation mechanism is added. Long-lived browser login usually adds refresh tokens, rotation, reuse detection, and server-side records.
- **Implementation:** Sessions reuse Spring's authentication, fixation protection, context persistence, and logout support. JWT adds signing keys, algorithm/issuer/audience/expiry validation, key rotation, and refresh/revocation decisions.
- **Scaling:** An in-memory session requires a single backend instance and is lost on restart. JWT can support independent verifiers, although refresh/revocation still creates state. If OpenShelf later needs multiple instances or durable sessions, evaluate Spring Session JDBC against PostgreSQL before adding another infrastructure service.
- **Security:** Both depend on HTTPS, sound authorization, XSS prevention, and safe credential handling. CSRF depends on how credentials are transported, not whether their format is JWT. Neither approach makes client-side route guards an authorization boundary.

JWT is reasonable if a future native client, third-party API, or independently deployed resource server requires it. It adds work to the current browser application. OWASP describes these JWT validation and revocation responsibilities in its [JWT guidance](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html).

## 2. Migration Safety and User Schema

Source inspection confirmed no JJWT usage. Phase 1 removes all three unused JJWT dependencies and implements no JWT, Bearer authentication, or refresh tokens. Bouncy Castle `bcprov-jdk18on:1.86` supplies Argon2; Testcontainers PostgreSQL is test-scoped and managed by Spring Boot's dependency BOM.

`spring.flyway.baseline-on-migrate` is now explicitly `false`; `ddl-auto` remains `validate`. A fresh empty schema should execute V1 normally. An existing Flyway-managed schema should validate its history and execute only pending migrations. A non-empty schema without history should fail and require investigation rather than silently assume a baseline. Automatic baselining can skip migrations at or below the baseline version and removes a wrong-database safety check. See [Flyway's baseline-on-migrate reference](https://documentation.red-gate.com/fd/flyway-baseline-on-migrate-setting-277578974.html).

`V1__init.sql` contains comments only and remains byte-identical. The existing development database has one successful SQL history row for V1 and remains unchanged. All migration, write, and browser verification runs used disposable PostgreSQL containers; no reset, clean, repair, or baseline command was used.

The forward-only `V2__create_users_table.sql` introduces only `users`, using the DDL below. V2 is verified in disposable databases and will apply to the normal development database on its next backend startup; it was not automatically applied to that database during this task.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_email_canonical CHECK (
        email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254
    ),
    CONSTRAINT ck_users_display_name CHECK (
        char_length(btrim(display_name)) BETWEEN 1 AND 80
    ),
    CONSTRAINT ck_users_role CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN'))
);
```

- Generate UUIDs in Java before insert; no PostgreSQL extension is necessary.
- Treat email as a case-insensitive account identifier. For this initial contract accept ASCII email addresses, trim them, and lowercase with `Locale.ROOT` for registration and login. Do not implement provider-specific dot or plus-address rewriting. Enforce the same normalization in tests and database constraints.
- The unique constraint is the final concurrency guard. An optional existence check improves feedback but cannot prevent a race; translate only the named email-uniqueness violation to 409 after the failed transaction has rolled back.
- Trim display names, preserve their case, render them as text, and never accept `id`, `role`, hashes, or timestamps from the registration DTO. Reject unknown JSON fields on auth requests rather than accepting attempted role assignment.
- Set timestamps on creation and update in UTC using a testable application clock; database defaults provide insert defaults, not an automatic update trigger.
- Public registration always assigns `ROLE_USER`. Admin provisioning requires a separate explicitly authorized operational process; no default admin credentials or public role-changing endpoint.
- Phase 1 has no refresh-token, JWT, session, book, preference, progress, or annotation tables. Servlet sessions initially live in backend memory.

### Password storage

Passwords use **Argon2id** through Spring Security's `PasswordEncoder`: memory 19,456 KiB, iterations 2, parallelism 1, random 16-byte salt, 32-byte hash. `Argon2PasswordEncoder` uses Bouncy Castle and a `DelegatingPasswordEncoder` encoding id of `argon2`. The complete `{argon2}`-prefixed value is stored. Benchmark on deployment hardware and increase cost when practical; tests use the same minimum settings.

This approved choice replaces the earlier BCrypt roadmap. [OWASP recommends Argon2id for new systems](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html); Spring documents [its encoders, provider requirement, and upgradeable hash format](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html). BCrypt could preserve the previous choice with cost at least 10 and an enforced 72-byte UTF-8 input limit, but that limit complicates passphrase handling.

Registration passwords must have 15–128 Unicode code points, allow spaces and Unicode, and must not be trimmed, lowercased, normalized, or silently truncated. Reject all-whitespace input; avoid arbitrary composition rules. Use Jakarta annotations for required fields and bounded input plus a dedicated validator for code-point length. Bound auth JSON request bodies to 8 KiB. Login uses required/nonblank and maximum-length checks, without reapplying a future registration minimum to existing credentials. Passwords, hashes, cookies, and CSRF tokens must be excluded from logs and errors.

## 3. API Contracts

All routes use `/api/v1`, JSON, explicit request/response DTOs, and the existing `api-conventions.md` success/error envelope. No token or session ID appears in response JSON or URLs. Auth/profile/CSRF responses use `Cache-Control: no-store`.

**Shared successful user payload** (`UserResponse` and matching TypeScript `User`):

```json
{
  "success": true,
  "data": {
    "id": "88dccae2-cc09-4e95-87dd-dd4a2f2c8a59",
    "email": "reader@example.com",
    "displayName": "Reader",
    "role": "ROLE_USER",
    "createdAt": "2026-11-12T12:00:00Z",
    "updatedAt": "2026-11-12T12:00:00Z"
  },
  "timestamp": "2026-11-12T12:00:00Z"
}
```

1. **`GET /auth/csrf` — public, 200.** Materialize Spring's deferred `CsrfToken`, creating an anonymous session when needed. Return `data: { "headerName": "X-CSRF-TOKEN", "token": "<masked token>" }` in the success envelope. Token is not an authentication credential and stays only in JavaScript memory. Repeated reads need not rotate the underlying token.
2. **`POST /auth/register` — public, CSRF required, 201.** Body `{ "email": "reader@example.com", "password": "<passphrase>", "displayName": "Reader" }`. Return the shared user envelope. Registration creates an account but does not authenticate or switch an already logged-in account. The UI routes to login after success. Validation errors return 400; duplicate canonical email returns 409 `EMAIL_ALREADY_EXISTS`.
3. **`POST /auth/login` — public, CSRF required, 200.** Body `{ "email": "reader@example.com", "password": "<passphrase>" }`. Authenticate, rotate the session ID, clear the previous CSRF token, explicitly persist the security context, and return the shared user envelope plus the session `Set-Cookie`. Unknown email and wrong password both return 401 `INVALID_CREDENTIALS` with the same message and comparable password-hashing work. A failed login does not establish a new authenticated session. Account switching uses logout first in the UI.
4. **`GET /auth/me` — authenticated, 200.** Return the current user loaded by the UUID in the trusted principal. No request-supplied user ID. Anonymous, expired, invalidated, or deleted-user sessions return 401 `UNAUTHENTICATED`; invalidate a deleted-user session. No fabricated anonymous user object.
5. **`POST /auth/logout` — CSRF required, 204, empty body.** Use Spring Security logout handlers to invalidate the current session, clear the security context and CSRF token, and expire the session cookie using the same name/path/domain settings. Permit logout with a valid anonymous session/token so repeated logout is safe after CSRF rebootstrap. GET must never log a user out. A request with an expired session and stale/missing CSRF token returns 403 before logout; the client fetches a fresh token before retrying explicitly.

Use HTTP 400 `VALIDATION_ERROR` for field errors, 400 `MALFORMED_REQUEST` for invalid JSON/unknown fields, 401 for missing authentication or invalid credentials, 403 `ACCESS_DENIED` for insufficient privileges, 403 `CSRF_INVALID` for missing/invalid CSRF, 409 for duplicate email, 413 for oversized bodies, 415 for non-JSON credential submissions, and 429 `RATE_LIMITED` with `Retry-After` for throttled requests. Security filters require the same envelope via an `AuthenticationEntryPoint`, `AccessDeniedHandler`, and logout success handler; controller advice alone cannot catch filter failures.

Example error, following the existing convention:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields",
    "status": 400,
    "details": [{ "field": "email", "issue": "Enter a valid email address" }]
  },
  "timestamp": "2026-11-12T12:00:00Z"
}
```

Do not echo rejected passwords or raw database exceptions. The approved 409 duplicate-email contract follows the current roadmap but reveals account existence; record that tradeoff rather than claiming enumeration is completely prevented.

## 4. Session Cookie and CSRF Lifecycle

**Production:** `__Host-openshelf-session=<opaque id>; Path=/; Secure; HttpOnly; SameSite=Lax`. Omit `Domain` to keep it host-only; omit `Max-Age`/`Expires` for a browser session cookie. Use cookie-only session tracking; disable URL-based session IDs. Configure a 30-minute server-side idle timeout. Browser session restore can preserve cookies, so browser close is not an assured logout. No remember-me in this scope.

**Local HTTP:** `openshelf-session` with `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`, and `Secure=false` only in the local profile. Production must force `Secure=true` behind the trusted HTTPS proxy. Keep `localhost` consistent throughout local browser URLs; do not mix it with `127.0.0.1` for cookie requests.

These attributes follow [OWASP's session-cookie guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). SameSite is an additional defense, not a substitute for CSRF validation. HttpOnly limits cookie theft through JavaScript but does not stop injected code from making requests as the user.

Use `SessionCreationPolicy.IF_REQUIRED`, `HttpSessionCsrfTokenRepository`, and Spring's default XOR/BREACH-aware CSRF request handler. Return the resolved masked token from the CSRF endpoint and send that exact value in `X-CSRF-TOKEN`. This avoids a second JavaScript-readable CSRF cookie or a custom raw-token resolver. Spring documents the [session-backed endpoint pattern and token renewal after authentication/logout](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).

Browser sequence:

1. On app start or full reload, call `/auth/csrf`, retain its token in memory, then call `/auth/me`. A 401 means guest; a network/5xx failure means session status is unknown and should show retry UI, not silently log out.
2. Send the token header for POST/PUT/PATCH/DELETE to the trusted API only, including registration, login, and logout. Read-only operations must not mutate business data.
3. After successful login, discard the old token, fetch `/auth/csrf` again, then permit authenticated mutations. Clear the previous account's query data before presenting a new account.
4. After logout, remove account-specific cached data and the in-memory token, then fetch a fresh anonymous token for another login. A page refresh restores the user via `/me` while the server session remains valid.
5. On `CSRF_INVALID`, refresh the token and ask the user to resubmit the failed operation. Do not automatically replay arbitrary mutations. On 401, clear private cache/state and show login. Disable automatic retries for credential mutations and 401/403 responses.

The existing relative Axios base URL and Vite proxy already support one origin. Set `withCredentials: true` on the trusted API client for clarity; explicitly attach the CSRF header from memory rather than relying on Axios's default `XSRF-TOKEN` cookie behavior. Never persist authentication credentials in localStorage/sessionStorage or attach CSRF tokens to arbitrary absolute URLs.

Production should keep the same origin. If a separate frontend origin later becomes necessary, explicitly allow only the configured origin with credentials, never `*`, enable CORS processing before security, and test preflights. Truly cross-site cookies require `SameSite=None; Secure` and can be blocked by browser third-party-cookie policy; use the same-origin proxy rather than making that the default design.

## 5. Security Wiring and Authorization

- Keep lambda-based Spring Security 7 configuration and `spring-boot-starter-webmvc`. Replace bootstrap HTTP Basic; disable generated form-login redirects and request caching for REST endpoints. Return JSON 401/403 with no Basic challenge or HTML redirect.
- Permit only `GET /actuator/health` and `/actuator/health/**`, `GET /api/v1/auth/csrf`, and POST registration/login/logout by explicit method/path. `/auth/me` requires authentication; never permit `/auth/**` wholesale. Other Actuator endpoints remain protected.
- Reserve `/api/v1/admin/**` for `ROLE_ADMIN`; all other application routes require authentication until explicitly designed. Map an admin principal to both USER and ADMIN authorities so user checks include administrators. No admin endpoints are implemented in this increment.
- Backend ownership rules remain mandatory when private features arrive. An admin role does not grant access to another reader's private notes or reading history. Do not accept an identity or authority from request JSON, browser route state, or a query parameter.
- A JSON login controller must use `AuthenticationManager`/`DaoAuthenticationProvider`, then explicitly invoke a shared `SessionAuthenticationStrategy` composed of session-ID rotation and `CsrfAuthenticationStrategy`. Create an empty security context, set the authenticated principal, and save it through the configured `SecurityContextRepository` before committing the response. Merely setting `SecurityContextHolder` does not persist a login. See [Spring's context-persistence and session guidance](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html).
- Keep servlet request/response, session strategies, and cookie behavior in `security/` and the HTTP adapter. `AuthService` owns transactional registration and profile retrieval; repositories own queries; DTO mapping stays explicit. Do not pass servlet objects into persistence/business services.
- Use a dedicated principal containing UUID, canonical email, and authorities, never a JPA entity. Erase credential material after authentication; do not retain a password hash in the saved session principal.
- Initial sessions are in memory and deliberately do not survive backend restarts/deploys. Profile reads reload the user. Phase 1 has no account-disable, password-change, or role-change API; introducing those requires immediate session-revocation/authority-refresh semantics, not stale cached role assumptions.
- Add bounded, single-instance throttling before expensive hashing: login limits of 10 attempts per canonical email and 30 per client IP per 15 minutes; registration 5 per IP per hour. Use expiring counters with a hard size bound, a testable clock, and no permanent account lockout. Exceeding a limit returns 429. Trust forwarded client IPs only from the configured proxy; document limits as tunable deployment policy.
- Keep HTTPS and standard security headers. Do not log credentials, request bodies for auth routes, session identifiers, hashes, or CSRF values. Authentication remains live when later business pages use typed mocks.

## 6. Approved Implementation Sequence

The following sequence was approved and followed in Phase 1. The [implementation report](../development/phase-1-implementation.md) records the resulting files and executed checks. Applying V2 to the existing development database remains a separate startup action; verification used disposable databases.

1. **Confirm the design and contracts.** Approve sessions, the cookie/CSRF lifecycle, Argon2id, registration without automatic login, normalization, timeouts, throttle limits, and the duplicate-email disclosure tradeoff. Update `api-conventions.md`, `database-design.md`, and product requirements to reference the accepted contract. Remove the three unused JJWT dependencies; add the compatible Bouncy Castle provider for the selected encoder.
2. **Isolate test databases first.** Add a PostgreSQL 17 Testcontainers test setup with dynamic datasource properties. Ensure both the context smoke test and all future persistence/integration tests use disposable databases, never the local Compose volume. Keep Flyway enabled and JPA DDL at `validate`. Make `scripts/test-backend.ps1` propagate Maven's actual exit code so a wrapper failure cannot appear successful.
3. **Add V2 and persistence.** Create `entity/User.java`, `enums/Role.java`, `repository/UserRepository.java`, and `mapper/UserMapper.java`; add only the proposed users migration. Verify V1→V2 and empty-database→V1→V2 in disposable PostgreSQL. Do not apply V2 to the existing development database until the migration change is reviewed and its application is authorized.
4. **Add DTOs and registration.** Add `dto/request/RegisterRequest.java`, `LoginRequest.java`, `dto/response/UserResponse.java`, `CsrfResponse.java`, generic success/error DTOs, `service/AuthService.java`, and `exception/GlobalExceptionHandler.java` with narrowly mapped exceptions. Add password/email validators under `validation/`; use constructor injection. Test normalization, hashing, duplicate races, rollback, and response redaction.
5. **Wire session security and endpoints.** Add `security/OpenShelfUserDetailsService.java`, principal, session-login adapter, shared strategies/repository, JSON entry point/access-denied handling, cookie/timeout profile settings, and `controller/AuthController.java`. Map logout through Spring handlers. Test the real security chain, context persistence across requests, session rotation, stale CSRF rejection, and cookie deletion before frontend integration.
6. **Implement typed frontend integration.** Add `types/auth.ts` and shared API types; implement `services/authService.ts` and the CSRF-aware `services/apiClient.ts`. Add `hooks/useCurrentUser.ts`, `hooks/useAuth.ts`, `contexts/AuthContext.ts`, and `providers/AuthProvider.tsx` as appropriate. TanStack Query owns the current-user response; context exposes derived state/actions rather than duplicating the user in local state. Add `pages/LoginPage.tsx`, `RegisterPage.tsx`, and `routes/ProtectedRoute.tsx` with loading/error states and validated internal return URLs. Keep role checks as UI affordances; the backend enforces permissions.
7. **Verify behavior and update status.** Run the mandatory backend script and frontend build/lint, plus the new frontend tests and browser E2E tests. Update current state with actual results and limitations. Review the diff and migration before applying to existing data. No commit, push, database reset, or applied-migration edit without approval. Only after accepted Authentication should Phase 2 design-system work begin.

Profile editing, avatar storage, account preferences, password reset/change, email verification, MFA, admin account-management screens, persistent/clustered sessions, and all book/reader business implementations are separate tasks. This increment must not be described as complete identity lifecycle management; recovery and email verification remain prerequisites to evaluate before a public production launch.

## 7. Required Tests and Acceptance Criteria

**Persistence/service tests (real disposable PostgreSQL):**

- V1 stays byte-identical; its history checksum is unchanged by V2. An empty schema applies V1 then V2; an existing V1-managed schema upgrades without losing its rows or unrelated sentinel data. A non-empty unmanaged schema fails with automatic baseline disabled.
- Canonical and case/whitespace email duplicates fail deterministically, including concurrent registrations; successful registration stores only a salted encoded hash and ROLE_USER. Attempted role/id injection is rejected.
- Validate email, blank names, password boundaries including Unicode code points, malformed JSON, and oversized input. No password normalization or truncation; identical passwords yield different hashes and verify correctly.

**Security/HTTP integration tests (MockMvc with the actual filter chain):**

- Obtain a real token from `/csrf`; carry the resulting session through registration/login/me/logout. Do not rely only on `with(csrf())` or mocked users, which cannot prove the browser protocol.
- Missing/invalid CSRF rejects registration, login, and logout with 403. Correct tokens succeed; an anonymous cookie/token does not grant `/me` or private access. Unsupported methods do not open extra public routes.
- Successful login changes the session ID; the old ID cannot access `/me`. CSRF is rotated; the old token fails on a subsequent unsafe request. The saved context survives a second request, with no credential hash retained in the principal.
- Wrong email/password produce the same 401 contract; anonymous protected GET returns 401, valid USER on an admin route returns 403, and an ADMIN is authorized for both role levels. Use test-only probe endpoints for permission checks, not premature business controllers.
- Logout invalidates the server session and expires the exact cookie. Reusing the old cookie cannot authenticate. Repeated logout works after obtaining a fresh token. GET logout never changes session state.
- Session expiry, deleted users, no-store headers, JSON security errors, throttle expiry/limits, body size, no Basic challenge/redirect, and production cookie flags are verified. If cross-origin mode is supported, add allowed/disallowed origin and preflight cases.

**Frontend/component and browser tests:**

- Add Vitest/React Testing Library for the auth forms and derived session states; add Playwright for the browser cookie/security flow. None is present in the current package scripts.
- Register→login→reload→`/me` works through Vite's proxy; logout clears private caches; switching accounts cannot display prior account data. Test 400/401/403/409/429 and network/5xx states without request loops or credential-mutation retries.
- Test HttpOnly cookie behavior and Secure/SameSite/deletion in an HTTPS test environment. JavaScript has no access to the session identifier; no auth credentials enter browser storage. Missing/stale CSRF is rejected and refresh is handled without automatic mutation replay.
- Check protected-route loading behavior, internal-only return URLs, keyboard navigation, accessible field errors, and responsive login/register forms. Auth never uses the later business-feature mock switch.

**Completion gate:** All approved endpoints, persistence, cookie/CSRF behavior, negative authorization cases, disposable database migrations, and browser flows pass. Run `powershell -ExecutionPolicy Bypass -File scripts\test-backend.ps1`, `npm.cmd run build`, and `npm.cmd run lint`; record exact counts and warnings. A passing bootstrap context test alone is not Authentication coverage.
