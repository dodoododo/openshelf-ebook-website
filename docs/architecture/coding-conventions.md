# OpenShelf — Coding Conventions & Engineering Standards

## 1. General Principles

- **Simplicity First:** Write readable, maintainable code over complex abstractions.
- **Architectural Integrity:** Strictly honor Layered Architecture. No feature modules or package-by-feature structures.
- **Single Source of Truth:** Keep types, API contracts, and schema definitions well documented and synchronized.
- **Zero Warnings:** Strive for clean compilation with no unhandled warnings or linting errors.

---

## 2. Backend Coding Conventions (Java 21 / Spring Boot 4.1)

### 2.1 Dependency Injection
- Always use **Constructor Dependency Injection**.
- Avoid field injection (`@Autowired` on private fields).
- Keep constructors explicit or use Lombok `@RequiredArgsConstructor` once introduced.

```java
// Correct
@Service
public class BookService {
    private final BookRepository bookRepository;
    private final StorageService storageService;

    public BookService(BookRepository bookRepository, StorageService storageService) {
        this.bookRepository = bookRepository;
        this.storageService = storageService;
    }
}
```

### 2.2 Controller & Service Boundaries
- **Controllers** are thin adapters: validate input, delegate to services, map responses, return `ResponseEntity`.
- **Services** own business logic, transactional boundaries (`@Transactional`), and entity-to-DTO orchestration.
- **Repositories** extend `JpaRepository` or `JpaSpecificationExecutor`. Do not put business rules in repositories.

### 2.3 Exception Handling
- Throw specific, custom unchecked exceptions (e.g., `ResourceNotFoundException`, `UnauthorizedAccessException`, `InvalidFileFormatException`).
- Place all domain exceptions in `com.openshelf.exception`.
- Map domain exceptions to standard HTTP response structures in `GlobalExceptionHandler` using `@ExceptionHandler`.

### 2.4 Entity & DTO Conventions
- Entities use `@Entity`, `@Table(name = "...")`, and snake_case column mappings.
- Entities must never be returned across controller boundaries.
- Use explicit Java records or classes for DTOs in `dto/request` and `dto/response`.

---

## 3. Frontend Coding Conventions (React / TypeScript / Tailwind)

### 3.1 Strict TypeScript
- `strict: true` is enabled in `tsconfig.json`.
- Do not use `any`. Use generics or `unknown` with type guards where data shape is dynamic.
- Export shared interfaces and types from `src/types/`.

### 3.2 Component Design & shadcn/ui
- Use standard functional components with React hooks.
- Base UI components belong in `src/components/ui/` and follow shadcn/ui patterns (`cva`, `Slot`, `cn()`).
- Business UI components are organized by visual responsibility (e.g. `src/components/reader/`, `src/components/books/`).
- Page components in `src/pages/` orchestrate layout and server state, delegating fine-grained presentation to reusable components.

### 3.3 Server State vs Client State
- **Server State (Remote Data):** Always manage via **TanStack Query** (`useQuery`, `useMutation`). Do not replicate server responses in `useState` or Redux.
- **Client State (Transient UI):** Use local `useState` or React Context for ephemeral reader state (e.g., sidebar collapse, active page input).

### 3.4 Styling with Tailwind CSS v4
- Use utility classes directly in JSX.
- Utilize the `cn()` helper for conditional classes.
- Standardize colors using the defined CSS variables (`bg-primary`, `text-muted-foreground`, etc.).
