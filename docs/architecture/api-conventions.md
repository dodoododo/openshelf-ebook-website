# OpenShelf — REST API Conventions & Standards

## 1. URI Naming & Formatting

- All application REST endpoints are prefixed with `/api/v1/`.
- Use lowercase nouns in plural form for resource identifiers (e.g., `/api/v1/books`, `/api/v1/users`).
- Use hyphens for multi-word paths (e.g., `/api/v1/reading-progress`, `/api/v1/publication-requests`).
- Sub-resources express ownership hierarchies (e.g., `/api/v1/books/{bookId}/bookmarks`).

---

## 2. Standard HTTP Methods & Status Codes

| Method | Idempotent | Intended Purpose | Success Code |
| :--- | :--- | :--- | :--- |
| `GET` | Yes | Retrieve resource or list | `200 OK` |
| `POST` | No | Create new resource or execute operation | `201 Created` / `200 OK` |
| `PUT` | Yes | Complete resource replacement | `200 OK` |
| `PATCH` | No | Partial resource update | `200 OK` |
| `DELETE` | Yes | Delete resource | `204 No Content` |

---

## 3. Standard Response Format

### 3.1 Single Resource Response
```json
{
  "success": true,
  "data": {
    "id": "c85d89b0-9c59-4bfe-b0d5-1f9191e3e7dc",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "status": "PRIVATE"
  },
  "timestamp": "2026-11-09T08:30:00Z"
}
```

### 3.2 Paginated Collection Response
```json
{
  "success": true,
  "data": [
    { "id": "uuid-1", "title": "Book 1" },
    { "id": "uuid-2", "title": "Book 2" }
  ],
  "pagination": {
    "page": 0,
    "size": 20,
    "totalElements": 42,
    "totalPages": 3,
    "isLast": false
  },
  "timestamp": "2026-11-09T08:30:00Z"
}
```

### 3.3 Standardized Error Response (RFC 7807 inspired)
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Book with ID c85d89b0 was not found",
    "status": 404,
    "details": [
      {
        "field": "bookId",
        "issue": "Entity does not exist or user lacks access rights"
      }
    ]
  },
  "timestamp": "2026-11-09T08:30:00Z"
}
```

---

## 4. Request Validation & DTO Rules

1. **Strict Input Typing:** All request bodies must be mapped to explicit Request DTO classes placed in `com.openshelf.dto.request.*`.
2. **Bean Validation:** Use standard Jakarta validation annotations (`@NotNull`, `@NotBlank`, `@Size`, `@Email`, `@Min`, `@Max`).
3. **Never Accept Entities:** Controllers must never accept JPA Entities directly in `@RequestBody` or `@ModelAttribute`.
4. **Validation Handling:** Validation exceptions must be caught by a centralized `@RestControllerAdvice` in `com.openshelf.exception.GlobalExceptionHandler` and converted to the standard error structure.

## 5. Implemented Authentication Contracts

The [approved Authentication design](authentication-design.md#3-api-contracts) specifies exact DTO shapes and cookie/CSRF lifecycle. All routes below use `/api/v1`:

- `GET /auth/csrf`: public, 200, success data `{ headerName, token }`; token is session-backed and masked.
- `POST /auth/register`: JSON `{ email, password, displayName }`, CSRF required, 201 with User; no automatic login. Duplicate normalized email returns 409.
- `POST /auth/login`: JSON `{ email, password }`, CSRF required, 200 with User and a rotated HttpOnly session cookie. Invalid credentials return 401.
- `GET /auth/me`: authenticated, 200 with User; otherwise 401. User is resolved by trusted principal UUID.
- `POST /auth/logout`: CSRF required, 204 without a body; invalidates the session and expires its cookie.

User contains `id`, `email`, `displayName`, `role`, `createdAt`, and `updatedAt`. No password/hash/session ID is returned. Registration assigns ROLE_USER; unknown request fields such as role are rejected. Request DTO `toString()` methods redact credentials.

Auth errors follow section 3.3, including filter-chain failures: 400 VALIDATION_ERROR or MALFORMED_REQUEST, 401 INVALID_CREDENTIALS or UNAUTHENTICATED, 403 CSRF_INVALID or ACCESS_DENIED, 409 EMAIL_ALREADY_EXISTS, 413 PAYLOAD_TOO_LARGE, 415 UNSUPPORTED_MEDIA_TYPE, and 429 RATE_LIMITED with Retry-After. Auth responses use Cache-Control: no-store. Clients renew CSRF after login/logout and do not automatically replay rejected mutations.

## 6. Private Book Contracts (Milestone 2)

All routes require the existing session; upload also requires the existing CSRF header. Ownership is taken from the authenticated principal. Form fields cannot assign an owner, file version, storage key, or visibility. Every new book is PRIVATE.

- `POST /api/v1/books`: `multipart/form-data` with a `file` part and plain form fields `title` (required, 1–200), `author` (required, 1–200), and optional `description` (maximum 4,000). Browser clients must allow the browser to supply the multipart boundary. Returns 201, a Location header, and `ApiResponse<BookResponse>`.
- `GET /api/v1/books/mine?page=0&size=20`: owned books, newest first with ID tie-breaker; size 1–50. Returns the section 3.2 collection envelope. Each book includes the latest file metadata; this milestone only writes version 1.
- `GET /api/v1/books/{bookId}`: returns `ApiResponse<BookResponse>`. A missing book or a book owned by another account returns identical 404 `BOOK_NOT_FOUND`. Malformed UUIDs return 400 `MALFORMED_REQUEST`.
- `GET /api/v1/books/{bookId}/file`: ownership-checked PDF `Resource`, `application/pdf`, safe fixed inline filename, `nosniff`, and `Cache-Control: no-store`. Full content returns 200; Spring MVC handles byte/suffix ranges with 206 and Content-Range and unsatisfiable ranges with 416. Authorization runs before range conversion. Clients send the session cookie; GET requires no CSRF token. No public static mapping or signed URL is created.

`BookResponse` contains `id`, `title`, `author`, `description`, `visibility`, `createdAt`, `updatedAt`, and `file`. File metadata contains `id`, `version`, `originalFilename`, `contentType`, `sizeBytes`, `sha256`, `pageCount`, and `createdAt`. No owner-supplied identity, local path, or storage key is exposed. All successful JSON responses use `Cache-Control: no-store`.

Upload validation returns the standard error envelope: 400 `VALIDATION_ERROR` for metadata, 400 `INVALID_PDF` for empty/wrong-extension/malformed/encrypted/unsupported PDFs, 413 `PAYLOAD_TOO_LARGE`, or 503 `STORAGE_UNAVAILABLE`. Database failures return generic 500 without SQL/filesystem details. Authentication/CSRF errors retain Phase 1 semantics, including 403 for missing CSRF before authorization and 401 for anonymous requests with valid CSRF. A 416 file-range response uses HTTP range headers rather than the JSON success envelope. Parsing establishes PDF structure/page count, not malware clearance.
