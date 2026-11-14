# OpenShelf — Coding Conventions & Engineering Standards

## 1. General Principles

- **Simplicity First:** Write readable, maintainable code over complex abstractions.
- **Architectural Integrity:** Strictly honor Layered Architecture (backend) and Folder-by-Type (frontend). No feature modules or package-by-feature structures.
- **Frontend-First Workflow:** After Authentication, build frontend layouts, pages, and interactive prototypes first using typed mock services before writing backend business logic.
- **Single Source of Truth:** Keep TypeScript interfaces (`src/types/`), API contracts, and schema definitions well documented and synchronized.
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
- **Controllers** are thin HTTP adapters: validate input with `@Valid`, delegate to services, map responses, return `ResponseEntity`.
- **Services** own business logic, transactional boundaries (`@Transactional`), and entity-to-DTO orchestration.
- **Repositories** extend `JpaRepository` or `JpaSpecificationExecutor`. Do not put business rules in repositories.

### 2.3 Exception Handling
- Throw specific, custom unchecked exceptions (e.g., `ResourceNotFoundException`, `EmailAlreadyExistsException`, `UnauthorizedAccessException`).
- Place all domain exceptions in `com.openshelf.exception`.
- Map domain exceptions to standard RFC 7807-compliant HTTP response structures in `GlobalExceptionHandler` using `@ExceptionHandler`.

### 2.4 Entity & DTO Conventions
- Entities use `@Entity`, `@Table(name = "...")`, and snake_case column mappings.
- Entities must never be returned across controller boundaries.
- Use explicit Java records or classes for DTOs in `dto/request` and `dto/response`.

---

## 3. Frontend Coding Conventions (React 19 / TypeScript / Tailwind CSS v4)

### 3.1 Strict TypeScript & Contract-First Design
- `strict: true` is enabled in `tsconfig.json`.
- Do not use `any`. Use generics or `unknown` with type guards where data shape is dynamic.
- Export shared interfaces and types from `src/types/`. All mock data and future API responses must conform to these types.

### 3.2 Frontend-First Mocking & Replaceable Service Layer
- **Service Functions:** All data fetching must be encapsulated inside `src/services/` (e.g., `bookService.ts`, `progressService.ts`). Components never call Axios or raw URLs directly.
- **Mock Placement:** Store mock datasets in `src/services/mocks/` with explicit typing:
  ```typescript
  import type { Book } from "@/types/book";

  export const MOCK_BOOKS: Book[] = [ ... ];
  ```
- **Service Interface Signature:** Service functions must return `Promise<ApiResponse<T>>` matching the real API response format, simulating asynchronous latency:
  ```typescript
  export async function getBook(id: string): Promise<ApiResponse<BookDetail>> {
    if (isMockMode()) {
      await delay(200);
      const book = MOCK_BOOK_DETAILS[id];
      if (!book) throw new Error("Book not found");
      return { success: true, data: book, timestamp: new Date().toISOString() };
    }
    const res = await apiClient.get<ApiResponse<BookDetail>>(`/api/v1/books/${id}`);
    return res.data;
  }
  ```
- **Mock Indicators:** Display a clear, non-intrusive badge (`MockDataBadge`) in development when an active view is fed by mock services, distinguishing it from live backend data (e.g., Auth).

### 3.3 Component Design & shadcn/ui
- Functional components with React hooks exclusively.
- Base UI components belong in `src/components/ui/` and follow shadcn/ui patterns (`cva`, `Slot`, `cn()`).
- Layout components belong in `src/components/layout/` (`AppShell`, `AppHeader`, `AppSidebar`, `MobileNav`).
- Reusable domain components belong in folder-by-type directories (e.g., `src/components/books/`, `src/components/reader/`).
- Page components in `src/pages/` orchestrate layout and server state, delegating fine-grained presentation to reusable components.

### 3.4 Responsive Design Standards
- OpenShelf must be fully responsive across mobile, tablet, and desktop:
  - Mobile (< 768px): Single-column cards, full-width canvas, slide-out drawer navigation.
  - Tablet (768px - 1024px): 2-column grids, compact sidebar.
  - Desktop (> 1024px): Multi-column grids, expanded sidebar, dual-page book spread reader.
- Use mobile-first Tailwind utility classes:
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  ```

### 3.5 PDF Reader Validation Standard
- Do not consider the Web Reader UI complete using simulated canvas mocks.
- The Reader component must load and render `public/sample.pdf` using PDF.js worker, verifying single-page, dual-page spread, zoom, and text-selection overlay behavior against actual document geometry.

### 3.6 Server State vs Client State
- **Server State (Remote Data):** Always manage via **TanStack Query** (`useQuery`, `useMutation`). Do not replicate server responses in `useState`.
- **Client State (Transient UI):** Use local `useState` or React Context for ephemeral reader state (e.g., active page input, sidebar collapse).

### 3.7 Shared Visual Foundation
- Follow the [design system](../design/design-system.md): semantic light/dark tokens in `styles/globals.css`, shared layout compositions in `styles/layout.css`, and reusable primitives in `components/ui/`.
- Use `ThemeProvider` / `useTheme` for appearance. Store only the explicit appearance preference under `openshelf-theme`; authentication secrets remain out of browser storage.
- Nest normal application pages under `AppShell`; authentication pages remain separate. A future PDF Reader must use a dedicated reading layout.
- Preserve accessible names, 44px controls, visible focus, modal focus management, reduced-motion behavior, and a single main landmark. New layout changes should keep the 375/768/1280/1440px checks passing.
- Build only primitives currently used by screens. Clearly label mock data and layout previews; do not present decorative covers as live book records.
