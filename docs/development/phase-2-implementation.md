# Phase 2 implementation and verification

Implemented on 2026-11-12. This report describes only Phase 2 changes, relative to a SHA-256 snapshot taken before this task. The checkout already contained uncommitted Phase 1 work; that work was preserved. No commit or push was performed.

## Delivered foundation

The interface uses warm paper, forest ink, Newsreader editorial headlines, and DM Sans UI text. Semantic light/dark tokens cover surfaces, actions, selected states, validation, focus, and subtle shadows. Fonts are self-hosted through Fontsource. Appearance follows the device by default; explicit choices persist under `openshelf-theme`, without storing authentication credentials.

`AppShell` supports nested routes, one main landmark, a skip link, and route-change focus. `AppHeader`, `AppSidebar`, `MobileNav`, `ShelfNavigation`, `Brand`, `SearchDialog`, and `PageHeading` form the reusable layout. Desktop has an expanded/collapsible sidebar; 768–1023px uses an icon rail; mobile uses a modal drawer. The future PDF Reader is deliberately outside this shell contract.

Search navigates local page/shelf names only. Home is a small labelled layout demonstration with three decorative covers, two shared-card examples, and the existing real service-health request. Shelf routes are protected, explicit layout previews. No book catalog, CRUD, upload, reader, or business API was implemented.

Existing shadcn-style Button and Card primitives were refined; only used Input, Badge, Dialog, and DropdownMenu primitives were added. Login/register forms, session status, and the account page were restyled. The authentication mechanism, services, providers/context, CSRF code, protected-route implementation, and API contracts remain unchanged.

See [design system](../design/design-system.md) for tokens, typography, component conventions, storage, and layout structure.

## Executed verification

- `npm.cmd test`: **26 tests passed**, five files, final duration 16.53s. Includes all 19 prior Phase 1 tests, four appearance tests, and three layout tests.
- `npm.cmd run test:types`: passed; includes application, test, Playwright, and Vite configurations.
- `npm.cmd run build`: passed. Final JS 508.75 kB minified / 164.23 kB gzip; CSS 32.03 kB / 7.73 kB gzip. Vite emits a non-failing 500 kB chunk advisory.
- `npm.cmd run lint`: passed with no warnings. Removed the unused Button variants export that previously triggered Fast Refresh lint.
- `powershell -ExecutionPolicy Bypass -File scripts\test-backend.ps1`: **BUILD SUCCESS; 19 tests, 0 failures, 0 errors, 0 skipped**, total 2:32. All database writes use disposable PostgreSQL 17 Testcontainers; `.env` is not loaded.
- `npx.cmd playwright test --reporter=list`: **15 passed in 1.9m**, retries disabled, installed Microsoft Edge. Two unchanged Phase 1 browser tests use the real isolated backend on port 18080; 13 new tests use labelled test-only auth/health route fixtures for deterministic presentation states.
- Browser matrix: **375 / 768 / 1280 / 1440px, light and dark**, no horizontal overflow. Checked key 44px controls, keyboard skip/focus, main navigation, drawer focus containment/Escape/selection/tablet resize, sidebar collapse, local search, theme persistence into auth pages, guest protection, current-user menu, account/logout, and mobile authenticated/unavailable-session controls.
- Axe WCAG 2 A/AA and relevant WCAG 2.1 A/AA rules reported **zero violations in tested states**. Audited the eight reading-room views, mobile drawer, dark login, and account menu. This is automated coverage, not a full accessibility certification.
- All eight full-page screenshots were opened and visually inspected for hierarchy, spacing, truncation, and responsive consistency.

Initial checks caught low contrast on the decorative clay cover, a search label mismatch, and modal dropdown background handling. These were corrected before the final successful browser run. Theme test mocks were also isolated between tests. The existing auth test body and browser auth tests remain intact; their test render wrapper now supplies ThemeProvider.

Local run logs are ignored under `logs/phase2-backend-tests.log` and `logs/phase2-browser-tests.log`. Screenshots/traces are ignored under `frontend/test-results/`; rerunning Playwright may replace them. The isolated backend and Playwright preview server were stopped after verification.

## Screenshot evidence

- [375px light](../../frontend/test-results/layout-reading-room-375px--272df-cus-contrast-and-screenshot/reading-room-375-light.png), [375px dark](../../frontend/test-results/layout-reading-room-375px--db79f-cus-contrast-and-screenshot/reading-room-375-dark.png).
- [768px light](../../frontend/test-results/layout-reading-room-768px--a4d59-cus-contrast-and-screenshot/reading-room-768-light.png), [768px dark](../../frontend/test-results/layout-reading-room-768px--8de3c-cus-contrast-and-screenshot/reading-room-768-dark.png).
- [1280px light](../../frontend/test-results/layout-reading-room-1280px-73944-cus-contrast-and-screenshot/reading-room-1280-light.png), [1280px dark](../../frontend/test-results/layout-reading-room-1280px-21c43-cus-contrast-and-screenshot/reading-room-1280-dark.png).
- [1440px light](../../frontend/test-results/layout-reading-room-1440px-ea4f2-cus-contrast-and-screenshot/reading-room-1440-light.png), [1440px dark](../../frontend/test-results/layout-reading-room-1440px-83955-cus-contrast-and-screenshot/reading-room-1440-dark.png).

## Preservation and limits

The pre-Phase 2 snapshot contains 134 existing repository files. Comparing SHA-256 hashes confirms no backend files or migrations changed; all existing files remain present. Auth client/service/provider/context/hooks, login/register routing logic, ProtectedRoute, request validation, and the original browser auth tests are byte-identical to the snapshot. Only auth presentation and its unit-test provider wrapper changed.

The original development database's normalized logical dump still hashes to `A8FF402746F274810F42EFE11921DEF27F67EC1B0D4B15AEA8AC9BF016B8E261`, matching the pre-Phase 1 review. No reset or migration application was performed on that database. V2 remains a pending forward migration for its next normal backend startup. The preservation check used Docker Desktop's explicit `docker.exe` because a different `docker` executable shadows it on PATH.

Remaining limits: consider route-based splitting as Phase 3 grows beyond the current 508.75 kB bundle. Safari/Firefox, physical touch devices, full screen-reader review, deployed HTTPS, and Lighthouse/CLS were not tested. The prepaint theme script will need a nonce or hash if a strict deployment CSP is introduced. Historical non-failing Maven repository/JVM-agent warnings and Playwright NO_COLOR/FORCE_COLOR notices remain unrelated to this scope.

Recommended next page: **Discover/Explore frontend prototype** with typed book DTO expectations, replaceable mock services, visible mock-data labelling, and loading/empty/error states. Phase 3 has not been started. Backend business features remain deferred.

## Actual files created and modified

Inventory below is relative to the pre-task snapshot, so earlier dirty Phase 1 files are not misreported as Phase 2 changes. There are **30 created and 18 modified files**, with none deleted. Runtime dependencies added: Fontsource DM Sans/Newsreader and Radix Dialog/DropdownMenu; `@axe-core/playwright` is development-only.

### Created

- `docs/design/design-system.md`
- `docs/development/phase-2-implementation.md`
- `frontend/src/components/common/ConnectionStatus.tsx`
- `frontend/src/components/common/ThemeToggle.tsx`
- `frontend/src/components/layout/AppHeader.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/AppSidebar.tsx`
- `frontend/src/components/layout/Brand.tsx`
- `frontend/src/components/layout/MobileNav.tsx`
- `frontend/src/components/layout/PageHeading.tsx`
- `frontend/src/components/layout/SearchDialog.tsx`
- `frontend/src/components/layout/ShelfNavigation.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/dialog.tsx`
- `frontend/src/components/ui/dropdown-menu.tsx`
- `frontend/src/components/ui/input.tsx`
- `frontend/src/contexts/ThemeContext.ts`
- `frontend/src/hooks/useTheme.ts`
- `frontend/src/lib/navigation.ts`
- `frontend/src/lib/theme.ts`
- `frontend/src/pages/NotFoundPage.tsx`
- `frontend/src/pages/ShelfPreviewPage.tsx`
- `frontend/src/providers/ThemeProvider.tsx`
- `frontend/src/styles/demo.css`
- `frontend/src/styles/layout.css`
- `frontend/src/types/navigation.ts`
- `frontend/src/types/theme.ts`
- `frontend/tests/e2e/layout.spec.ts`
- `frontend/tests/layout.test.tsx`
- `frontend/tests/theme.test.tsx`

### Modified

- `docs/architecture/coding-conventions.md`
- `docs/development/current-state.md`
- `docs/development/roadmap.md`
- `frontend/index.html`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/public/favicon.svg`
- `frontend/src/App.tsx`
- `frontend/src/components/common/AuthForm.tsx`
- `frontend/src/components/common/SessionStatus.tsx`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/card.tsx`
- `frontend/src/pages/AccountPage.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/routes/index.tsx`
- `frontend/src/styles/globals.css`
- `frontend/tests/authFlow.test.tsx`
- `frontend/tests/setup.ts`
