# UI Revamp - Warm Bookshelf Design

- Date: 2026-07-21
- Status: Draft (awaiting owner review)
- Owner decisions captured: see "Owner decisions" section

## 1. Goal

Revamp the visual appearance of the AI Reading Companion web app so it matches the Figma bookshelf UI reference at `reference/Figma UI Reference - Reading app`. Revamp scope is appearances only; no new product features are built in this round.

The app must look like the Figma on both phone and PC displays, using the same warm "wooden library" color tone, the same bottom navigation (Journey, Persona, Bookshelf, Profile), and the same physical bookshelf metaphor.

## 2. Owner decisions (captured during planning)

1. Scope: revamp all main screens (Bookshelf, Persona, Profile). The immersive reading screen (`/read`) is out of scope for redesign.
2. Theme: warm dark only, matching Figma colors exactly. Light mode is removed.
3. PC layout: adaptive shelf. 3 books per row on phone, more per row on wider screens. Bottom navigation remains on all screen sizes.
4. Bottom nav tabs:
   - Journey -> new coming-soon placeholder page.
   - Persona -> existing persona screen.
   - Bookshelf -> home (`/`).
   - Profile -> new page that contains the old Settings content.
   - Old `/settings` route forwards (client-side) to `/profile`.
5. Filter pills (All Books / Favorites / To Read / Finished): all four are shown. Only "All Books" works; the others show a "Coming soon" toast. The reading status feature is not built in this round.
6. Book covers: real EPUB cover image when present; generated Figma-style cover (warm solid color + botanical SVG motif + title) as fallback.
7. Unbuilt Figma functions (search, more menu, slider filters, hamburger menu) use a "Coming soon" toast. No dead buttons.

## 3. Sitemap after revamp

| Route | Status | Notes |
|---|---|---|
| `/` | Redesigned | Bookshelf (showcase screen) |
| `/journey` | New | Coming soon placeholder |
| `/persona` | Restyled | Existing persona list, warm theme |
| `/persona/new` | Restyled | Existing form, warm theme |
| `/persona/edit` | Restyled | Existing form, warm theme |
| `/profile` | New | Hosts existing SettingsForm + SystemPromptEditor, warm theme |
| `/settings` | Redirects | Client-side redirect to `/profile` (static export has no server redirects) |
| `/read` | Untouched layout | Colors shift to warm tokens via global theme; layout unchanged |

## 4. Theme system

### 4.1 Palette (single dark theme, locked)

The page has one theme. No light mode, no system toggle. One accent color (amber) locked across all sections.

| Token | Use | Hex | HSL channels (for globals.css) |
|---|---|---|---|
| App canvas (outer, desktop) | Fills screen outside app column | `#0A0603` | `26 54% 3%` |
| Shell / background | App background, shelf wall base | `#1C0F07` | `29 60% 7%` |
| Cream text (foreground) | Primary text | `#F0DCC0` | `35 62% 85%` |
| Muted caramel | Secondary text, subtitles | `#8A6038` | `29 42% 38%` |
| Dim caramel | Inactive nav/pill text | `#9A7048` | `29 36% 44%` |
| Amber accent | Icons, active highlights | `#C89060` | `28 51% 58%` |
| Amber bright | Active nav icon/label | `#E8B870` | `36 75% 67%` |
| Active pill bg | Active filter chip | `#9A6535` | `29 49% 41%` |
| Active nav pill bg | Active nav container | `#3D2010` | `21 58% 15%` |
| Very dark brown | Header divider / deep surface | `#26180A` | `30 58% 9%` |

Shelf plank gradient (literally from Figma App.tsx):
`linear-gradient(to bottom, #9A5A28 0%, #7A4020 35%, #8C5028 65%, #632E14 100%)`, with `box-shadow: 0 7px 20px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,195,100,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)`.

Wood wall background (Figma): `#1C0F07` with a faint repeating vertical-stripe gradient for texture.

### 4.2 Implementation approach

- Rewrite the CSS custom properties in `src/app/globals.css` from the current (mismatched slate/oklch) values to the warm palette above, using HSL channel triplets so the existing `hsl(var(--token))` references in `tailwind.config.ts` resolve correctly. Current globals.css defines tokens in oklch while tailwind.config wraps them with `hsl(...)` - that mismatch is to be fixed as part of this work.
- Define one `:root` block. No `.dark` variant. The `html` element does not need a theme class.
- Remove `next-themes`: delete `ThemeProvider` from `src/app/layout.tsx`, delete `src/components/theme-provider.tsx`. Replace `useTheme` usages:
  - `src/components/app-header.tsx` - file is deleted (replaced by per-page headers and BottomNav).
  - `src/components/reader/reader-topbar.tsx` - remove the theme toggle dropdown only. Leave the rest of the topbar untouched.
  - `src/components/ui/sonner.tsx` - hardcode `theme="dark"` on the Toaster.
- Font: replace `GeistSans` with Nunito via `next/font/google` in `layout.tsx` (self-hosts at build time, works under `output: 'export'`). Update `tailwind.config.ts` `fontFamily.sans` to use the Nunito CSS variable. Keep `GeistMono` available but unused unless a future need arises; simplest is to replace both with Nunito + a monospace fallback. Recommended: add Nunito as `--font-nunito`, set `fontFamily.sans = ['var(--font-nunito)', 'sans-serif']`. If build environment cannot fetch from Google at build time, fall back to the `@fontsource/nunito` npm package (offline). Verify fetch at build time during implementation.
- Manifest: update `src/app/manifest.ts` `theme_color` to `#1C0F07` and `background_color` to `#0A0603`.
- Update `DESIGN.md` to reflect the new warm palette, Nunito, dark-only, and bottom-nav layout (AGENTS.md requires docs stay current).

### 4.3 Shape and density

- Radius rule (one system, applied consistently):
  - Pills (filter chips, nav active pill): full pill / radius 22-99px.
  - Buttons: pill on the bookshelf showcase; standard shadcn `rounded-md` elsewhere via tokens.
  - Book covers: `2px 5px 5px 2px` (spine illusion), same on real and generated covers.
  - Cards, dialogs, inputs: keep shadcn token radius (`--radius`).
- No pure black `#000` and no pure white `#fff`. Cream text on dark surfaces; 4.5:1 contrast minimum verified for all text, focus rings, and form inputs.
- Icons: continue using `lucide-react` (already a project dependency). Bottom nav icons match Figma: `Compass`, `Fingerprint`, `BookMarked`, `CircleUser`.

## 5. App frame

### 5.1 Layout

Root layout becomes a full-height column:

```
<body class="bg-[#0A0603]">
  <main class="..."> page header + scrollable content </main>
  <BottomNav />  (hidden on /read)
</body>
```

- Use `min-h-[100dvh]` (never `h-screen`) on the body/app column.
- Bottom navigation is `sticky bottom-0` (or fixed) with `padding-bottom: env(safe-area-inset-bottom)` and the Figma's top fade gradient.
- Content above the nav gets `padding-bottom` equal to nav height plus safe area so nothing is hidden behind it.
- Outer canvas `#0A0603` fills the rest of wide desktop screens.
- Reader route (`/read`) keeps its own full-screen layout; `BottomNav` returns `null` when `usePathname()` starts with `/read` (same condition the current `AppHeader` uses).

### 5.2 Bottom navigation

New client component `src/components/bottom-nav.tsx` (replaces `app-header.tsx` which is deleted).

Four tabs in Figma order: Journey, Persona, Bookshelf, Profile.

| Tab | Icon | Route | Active styling |
|---|---|---|---|
| Journey | `Compass` | `/journey` | pill bg `#3D2010`, icon+label `#E8B870` |
| Persona | `Fingerprint` | `/persona` | same |
| Bookshelf | `BookMarked` | `/` | same |
| Profile | `CircleUser` | `/profile` | same |

- Inactive: icon `#6A5030`, label `#6A5030`, transparent background.
- Label: 11px Nunito semibold (Figma).
- Active state from `usePathname()`. For `/`, treat exact match (home is not a prefix match for everything).
- `minWidth: 64` per item (Figma).

### 5.3 Page headers

Each main screen renders its own in-page header (Figma style). Standard header structure: left a back/menu affordance when relevant, center the screen title (22px Nunito extrabold, cream) plus a 12px caramel subtitle, right the action icons. Concrete headers per screen are in section 6.

## 6. Screens

### 6.1 Bookshelf (`/`) - showcase, full rebuild

Files: `src/app/page.tsx`, `src/components/books/bookshelf.tsx`, `src/components/books/book-card.tsx` (rewritten), plus a new covers helper component for generated fallback covers.

**Header:** "My Bookshelf" + "Your journey begins here". Right-side icon buttons, in order: Import (working, `Plus` icon, opens the existing import flow), Search (`Search`, coming-soon toast), More (`MoreVertical`, coming-soon toast). Hamburger and the slider filter icon from the Figma are omitted because no current or planned function maps to them.

**Filter pills row:** four pills `All Books / Favorites / To Read / Finished` (`BookMarked`, `Heart`, `Bookmark`, `Check` icons). `All Books` is active and filters the list (all books). The other three remain visible and show a "Coming soon" toast when tapped. Styling:
- Active: bg `#9A6535`, text `#F5ECD8`, no border.
- Inactive: bg `rgba(255,255,255,0.065)`, text `#9A7048`, border `1px solid rgba(200,150,75,0.18)`.
- Horizontal scroll on small screens (`overflow-x-auto`, hide scrollbar).

**Shelf area:**
- Wooden wall background (Figma `WALL_BG`).
- Books are chunked into rows of N, rendered upright (aspect `2/3`) standing on a wooden plank row with the Figma plank gradient and shadow. Books within a row are spaced with `gap-2.5` over `px-3`.
- Empty slots at the end of the last row are left empty; the final empty slot shows the Figma vase decoration SVG (ported as a small component).
- Responsive books per row (adaptive, owner approved): 3 below 640px, 4 at `sm` (640px+), 5 at `lg` (1024px+), 6 at `xl` (1280px+). Implemented with CSS (e.g. a grid whose column count changes per breakpoint) is preferred; a resize listener is the fallback only if CSS cannot drive the chunking. Either way, the value is read in one place and used to chunk the book array. `min-w-0` on cells so the 2/3 ratio and `flex-1` do not overflow.
- Dark charred-wood outer canvas `#0A0603` on desktop around the app column.

**Book cover (`BookCard`, rewritten):**
- Real cover: when `book.coverRef` exists, load the blob from IndexedDB (existing pattern) and render it with `object-cover`, aspect `2/3`, spine radius `2px 5px 5px 2px` and the spine shadow `3px 0 6px rgba(0,0,0,0.45), inset -2px 0 4px rgba(0,0,0,0.25)`.
- Generated fallback: deterministic warm background color (hash of `book.id`), one of the ten Figma botanical motifs (port `MotifSVG` and its motif paths from Figma App.tsx), title text (uppercase, small, with text-shadow) and an author/format tag below.
- Tap the cover -> `/read?id=<book.id>` (existing behavior).
- Existing `BookMenu` (rename / delete) is shown via a small corner trigger on the cover that appears on hover (desktop) and on tap (mobile); the menu uses existing logic, just re-themed.
- Drag-to-reorder is preserved. Implementation: keep one `DndContext` + `SortableContext` over the flat books array; render books inside per-row wrappers (chunked). Strategy: `rectSortingStrategy` if it feels right after testing; otherwise fall back to a custom strategy. Reordering writes through existing `reorderBooks`. Flag: this is the trickiest piece and must be tested by actually dragging across rows on phone and desktop.
- Reading progress: a thin amber line (about 2-3px) at the bottom edge of the cover, width proportional to `chapterId / chapterCount`. Subtle, one accent color respected. (Owner can veto at review.)
- Empty state: shelf wall + one plank + vase + the line "No books yet" + a warm "Import a book" button (the existing import flow).

### 6.2 Persona (`/persona`, `/persona/new`, `/persona/edit`) - restyle

- In-page header: title "Persona", subtitle e.g. "Your reading companions". A working "New persona" button (existing flow) on the right.
- `PersonaCard`, `PersonaForm` and the create/edit pages keep their logic; they automatically re-theme through tokens. Add minor warm polish: card surfaces use a dark wood tone (`#26180A` or `rgba(255,255,255,0.04)`), text cream, focus rings amber, avatars keep their existing treatment.
- Empty state: warm, with `Users` icon.

### 6.3 Profile (`/profile`) - new

- New route `src/app/profile/page.tsx`.
- In-page header: title "Profile", no subtitle (or a short one).
- Content: the existing `SettingsForm` and `SystemPromptEditor` components, rendered inside the warm Profile layout. Their internals are untouched; they re-theme through tokens. A warm title or section labels may be added above each form for clarity.
- Future profile content (avatar, stats) is not built. A short placeholder line like "More profile features coming soon" is acceptable but optional.

### 6.4 `/settings` redirect

- `src/app/settings/page.tsx` becomes a tiny client component that calls `router.replace('/profile')` on mount and renders nothing.
- Static export: this produces `/settings/index.html`, so deep links still resolve and then forward. No `next.config` `redirects()` (not supported under `output: 'export'`).

### 6.5 Journey (`/journey`) - new

- New route `src/app/journey/page.tsx`.
- In-page header: title "Journey".
- Body: centered `Compass` icon (large, amber), "Journey is coming soon", a one-line description, all in the warm theme. No functional content.

### 6.6 Reader (`/read`) - untouched layout

- Reader components keep their current structure. The `reader-topbar.tsx` gets only the theme-toggle dropdown removed (because light mode no longer exists and `next-themes` is gone).
- The reader's colors shift to the new warm tokens automatically because it uses the same shadcn tokens. This is expected and keeps the app visually consistent.

## 7. Coming-soon pattern

- A single helper (e.g. `useComingSoon` hook or a `comingSoon()` call) that fires a `sonner` toast styled in the warm theme: "Coming soon" with a short description.
- Used for: the Search and More header icons on the bookshelf, and the Favorites / To Read / Finished filter pills.
- No dead buttons anywhere a user can tap.

## 8. Responsive and accessibility

- Breakpoints follow the project standard: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Shelf column counts at `sm/lg/xl` as in 6.1.
- Container widths: shelf showcase up to `max-w-[1024px]` centered with `mx-auto`; text pages (persona, profile, journey) up to `max-w-[640px]`. Outer canvas `#0A0603` fills the rest.
- All controls remain keyboard reachable; focus rings use the amber accent.
- Contrast: 4.5:1 minimum on all text, labels, placeholders, focus rings, and helper text against their surfaces, in the warm dark theme.
- `prefers-reduced-motion`: the bookcover hover lift and any fade/scale transitions degrade to static (or are light enough to be fine). No infinite loops, no scroll hijack, no parallax.
- No em-dash characters in any shipped UI string.

## 9. What stays unchanged

- All client-side storage (`localStorage`, `idb-keyval`), AI, import, EPUB/TXT parsing, reading, bookmarks, personas, threads logic.
- The `/read` screen layout and its reader components (except the removed theme toggle in the topbar).
- Existing vitest tests under `src/lib/__tests__` (lib logic only; visual changes do not touch them).
- PWA setup and service worker registration; only the manifest `theme_color` / `background_color` change.

## 10. Verification

Before declaring done:
1. `npm run lint` passes.
2. `npm run build` succeeds under `output: 'export'` with PWA.
3. `npm test` (vitest) still green.
4. Manual visual check at phone width (about 390px), tablet (about 768px), and desktop (1280px+).
5. Verify every tappable affordance works or shows the coming-soon toast (no dead buttons).
6. Verify drag-to-reorder works across rows on phone and desktop.
7. Verify import still works and a newly imported book appears on the shelf (with a generated cover if it has no real cover).
8. Verify `/settings` forwards to `/profile`.
9. Confirm no em-dash characters appear in any shipped UI string.

## 11. Risks and notes

- `output: 'export'` means all routing must be statically exportable; the `/settings` forward is therefore client-side (section 6.4). No server redirects.
- `next/font/google` for Nunito requires network access at build time to self-host the font. If the build environment is offline, switch to `@fontsource/nunito`. Confirm during phase 1.
- The current `globals.css` uses oklch tokens while `tailwind.config.ts` wraps them with `hsl(...)`; this mismatch is fixed by writing the new tokens as HSL channel triplets. Verify a sample component renders the correct warm color before mass-styling.
- Drag-to-reorder across chunked shelf rows is the most intricate part; budget extra testing here and have a fallback (e.g. move via book menu) if the drag feel degrades.
- Forcing dark theme globally re-tints the reader too. Owner confirmed on 2026-07-21: the reading screen should turn warm to match the bookshelf. The reader layout is unchanged; only its colors move to warm. No further action needed on this risk.
- Sub-agent review during planning returned empty results due to a tooling issue; the design was reviewed directly against the Figma source (`reference/.../src/app/App.tsx`) and the template image instead.

## 12. Implementation phases

Phases are executed in order, each reviewed before moving on (per writing-plans output).

1. **Theme foundation.** Rewrite `globals.css` warm HSL tokens; remove `next-themes` and `ThemeProvider`; remove theme toggle in `reader-topbar.tsx`; fix `sonner.tsx` to `theme="dark"`; add Nunito via `next/font/google`; update `tailwind.config.ts` font family; update `manifest.ts` colors; update `DESIGN.md`. Verify: build, a token spot-check renders warm, reader topbar still builds.
2. **App frame.** Delete `app-header.tsx`; add `bottom-nav.tsx`; restructure `layout.tsx` into the full-height column with sticky bottom nav; add the coming-soon toast helper. Verify: all existing routes still render, nav highlights the right tab, nav hidden on `/read`.
3. **Bookshelf rebuild.** Rewrite `page.tsx`, `bookshelf.tsx`, `book-card.tsx`; add the generated-motif cover component (port `MotifSVG` and vase from Figma); add the Figma header; add the filter pills; wire the adaptive books-per-row; keep dnd reorder, `BookMenu`, and `ImportButton`. Verify: drag across rows, import, tap-to-read, progress line, empty state, filters, coming-soon toasts.
4. **Persona + Profile + Journey.** Restyle `/persona` list, `/persona/new`, `/persona/edit` headers and surfaces; create `/profile` hosting `SettingsForm` + `SystemPromptEditor`; make `/settings` forward to `/profile`; create the `/journey` placeholder. Verify: settings save still works, persona create/edit/delete still works.
5. **Full verification.** Run lint, build, tests, and the manual checks in section 10 at phone, tablet, and desktop widths. Fix any contrast or polish issues.