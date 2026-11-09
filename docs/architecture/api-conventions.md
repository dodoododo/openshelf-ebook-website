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
