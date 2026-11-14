# OpenShelf visual foundation

Phase 2 establishes the shared interface, with a small reading-room demonstration. It does not implement the catalog or book features. Frontend source stays grouped by technical type; the backend remains layered.

## Visual language

Warm paper, forest ink, fine rules, generous space, and editorial headlines replace the bootstrap dashboard. Newsreader Variable is reserved for the wordmark, major headings, and short editorial phrases. DM Sans Variable carries navigation, body copy, form labels, and controls. Fontsource packages self-host the WOFF2 files; no Google Fonts or other font service is called. Both families use the SIL Open Font License supplied by their packages. Browser unicode ranges load only needed subsets.

## Tokens and typography

`frontend/src/styles/globals.css` owns the palette. Tailwind v4 `@theme inline` maps semantic CSS variables to shadcn-compatible utilities such as `bg-background`, `text-muted-foreground`, `border-input`, and `outline-ring`. The `dark` custom variant follows the root `data-theme` attribute.

- Background/foreground: light `#F6F2EA` / `#24372E`; dark `#18241E` / `#EEEADE`.
- Card/popover: light `#FCFAF6`; dark card `#1F2F26`, popover `#25382C`.
- Primary/action foreground: light `#294B3A` / `#FFFDF7`; dark `#C6D8BD` / `#1D3427`.
- Secondary/selected foreground: light `#DFE5DC` / `#294334`; dark `#324739` / `#E0E8D8`.
- Muted foreground: light `#5A685E`; dark `#AFBEB0`.
- Warm accent surface/foreground: light `#EBE0D0` / `#765238`; dark `#40382B` / `#E6BC93`.
- Border: light `#D1D6CB`; dark `#3E5143`. These separate surfaces; interactive input borders use the stronger `input` token (`#7B8C80` / `#758B79`).
- Focus ring: light `#41664D`; dark `#C6D8BD`. Success, destructive, and error surface/foreground pairs are theme-specific.
- Decorative book art has centrally defined `cover-*` tokens. They are not product action/status colors. The clay cover uses `#D5A17C` to preserve readable ink contrast.
- UI body is 15px with 1.6 line height; navigation is 13–14px; supporting labels are 11–12px. Major serif titles use responsive 36–80px sizes, with tighter line height and tracking. The smallest uppercase type is used only for decorative editorial captions, never form instructions.
- Content gutters scale with `clamp(1.25rem, 3.5vw, 3.5rem)`. Base radius is 6px; cards use 8px. Fine borders distinguish cards; shadows are reserved mainly for overlays.

Use semantic tokens for new screens rather than hardcoded per-component colors. Shared compositions belong in `styles/layout.css`; the limited reading-room demonstration lives in `styles/demo.css`. These small stylesheets complement Tailwind utilities without another UI framework.

## Appearance state

`ThemeProvider`, `ThemeContext`, `useTheme`, and `types/theme.ts` own local appearance state. The default follows `prefers-color-scheme` and responds to device changes. Explicit light/dark selections persist under `openshelf-theme`; returning to the device setting removes that key. Cross-tab storage updates are observed. Storage denial still permits an in-memory selection. The initial inline script applies the theme before React paints; it must be accommodated if a deployment adds a strict Content Security Policy.

Appearance preferences are stored by the theme layer. Milestone 1 additionally stores explicitly labelled mock reading progress in a separate versioned service key scoped by user, book, and document version. Session cookies, current-user queries, and in-memory CSRF remain owned by the existing authentication layer. The default theme writes nothing to localStorage.

## Layout and navigation

`AppShell` is a React Router layout route with `AppHeader`, `AppSidebar`, and an `Outlet` inside the single main landmark. A skip link and route-change focus support keyboard navigation. Login and registration remain outside this shell. The `/read/:bookId` route uses its own distraction-free layout rather than inheriting AppShell.

- Desktop, at least 1024px: expanded 248px sidebar, with an optional 84px collapsed rail and accessible expansion control.
- Tablet, 768–1023px: 84px icon rail with accessible labels and native titles. The desktop navigation and collapse control are hidden.
- Mobile, below 768px: sidebar is removed from layout. `MobileNav` opens a Radix modal drawer with a title, description, focus containment, Escape, close control, and focus restoration. Choosing a route closes it; changing to tablet width also closes it.
- Header: brand, desktop primary links, page search, appearance toggle, and account state. Desktop guests see sign-in/join links; mobile guests get those links inside the drawer. Authenticated users get their initial and account menu, including existing logout. Loading and server-error states do not masquerade as guests.
- `ShelfNavigation` consumes typed `lib/navigation.ts` entries for Discover, My Library, Continue Reading, Finished, Favourites, and My Published. Private shelf links direct guests through the existing ProtectedRoute. Preview routes contain no book data or operations.
- `SearchDialog` searches local page/shelf names only, with a `/` shortcut that ignores text entry and modifier keys. Its description explicitly explains that book search comes later. This creates no search API or book contract.
- `PageHeading` composes breadcrumbs, one page h1, supporting copy, and optional status badge. `NotFoundPage` gives unknown routes a working return path.

## Component and accessibility conventions

`components/ui/` retains the existing shadcn patterns (`cn`, `cva`, Radix, Slot, forwardRef) for Button and Card, and adds only used Input, Badge, Dialog, and DropdownMenu primitives. Native labels remain preferable to an unused wrapper. Tabs, toasts, tooltips, and skeleton primitives are deferred until a screen needs them.

Buttons and navigation controls have at least 44px height; icon controls are 44px square. Hover, selected, disabled, validation, and keyboard focus states use semantic tokens. Use real links for navigation and buttons for actions. Modal dialogs use Radix focus management; the account dropdown is nonmodal so the surrounding page is not hidden from assistive technology. Inputs preserve labels, autocomplete, field errors, and error summary behavior. Reduced-motion preferences disable nonessential transitions/animations.

The Home page marks itself `Layout preview`; decorative covers are hidden from assistive technology and captioned as illustrations, not library data. The small service-status footer remains a real health request through the existing service/hook. Authentication is live; shelf contents are explicitly previews.

## Verification and next screen

See [Phase 2 implementation and verification](../development/phase-2-implementation.md) for executed checks and file inventory. Automated accessibility checks supplement visual and keyboard inspection; they are not a full screen-reader audit.

The first Phase 3 screen is the dedicated [PDF Reader](reader-spec.md), using the same tokens, shadcn controls, and appearance provider. Milestone 2 replaces My Library's preview with real private book cards, pagination, empty/loading/error states, and a modal upload form using the existing Radix dialog, inputs, and buttons. Continue Reading and other shelves remain previews. The sample-reader link remains separate from uploaded books; real PDFs and local-only progress have distinct labels. No reader redesign was introduced.
