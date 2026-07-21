# UI Revamp - Warm Bookshelf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the AI Reading Companion app to match the Figma "warm wooden bookshelf" UI, dark-only, with bottom navigation (Journey, Persona, Bookshelf, Profile), across phone and PC, without changing any product features.

**Architecture:** Reskin in place. Replace the theme tokens (single warm dark palette via HSL custom properties mapped onto the existing shadcn token names), replace the top header with a persistent bottom navigation, and rebuild the bookshelf screen as a physical wooden shelf. Persona, Profile, and Journey screens reuse existing logic and components on top of the new theme. Reader screen layout is untouched; only its colors shift via tokens.

**Tech Stack:** Next.js 14 App Router (static export `output: 'export'`), React 18, TypeScript, Tailwind CSS v3, shadcn/ui, lucide-react, dnd-kit, idb-keyval + localStorage, sonner, PWA via `@ducanh2912/next-pwa`. Nunito font via `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-07-21-ui-revamp-warm-bookshelf-design.md`
**Figma source (verbatim port source):** `reference/Figma UI Reference - Reading app/reference/src/app/App.tsx`

## Global Constraints

Copied verbatim from the spec:

- Theme is warm dark ONLY. No light mode, no system toggle. Light/dark dropdown is removed entirely.
- One accent color (amber `#C89060` / `#E8B870`) locked across all sections. One palette per project.
- No pure black `#000` and no pure white `#fff`. Use off-black / cream.
- Icons from `lucide-react` only (already a dependency). No hand-rolled SVG icon paths. (Decorative botanical motifs are SVG illustrations, not UI icons - allowed.)
- No em-dash characters (`—` or `–`) in any shipped UI string. Use a hyphen, period, or comma instead.
- Reader screen layout is out of scope for redesign; only its colors change via tokens. Owner confirmed 2026-07-21: reader goes warm.
- `output: 'export'` is set in `next.config.mjs`. No server-side redirects. The `/settings` to `/profile` forward is client-side.
- WCAG AA contrast (4.5:1 body, 3:1 large) verified for all text, placeholders, focus rings, and helper text against their surfaces.
- `prefers-reduced-motion` honored (no infinite loops, no scroll hijack, no parallax; hover lift degrades to static).
- Existing vitest tests under `src/lib/__tests__` must stay green. New unit test added for the generated-cover color/motif picker.
- The `globals.css`/`tailwind.config.ts` color mismatch (oklch tokens wrapped in `hsl(...)`) is fixed as part of Task 1: new tokens are HSL channel triplets.
- Commit after each task. Never commit secrets.

## File Structure

**New files:**
- `src/lib/book-motifs.ts` - deterministic cover color + motif picker (pure, unit-tested).
- `src/lib/__tests__/book-motifs.test.ts` - unit test for the picker.
- `src/components/books/motifs.tsx` - `MotifSVG` (10 botanical illustrations) and `VaseDecoration` ported verbatim from the Figma reference.
- `src/components/books/generated-cover.tsx` - `GeneratedCover` presentational component using `MotifSVG`.
- `src/components/books/book-header.tsx` - the Figma bookshelf header (title, subtitle, action icons).
- `src/components/books/filter-pills.tsx` - the four filter pills row.
- `src/components/bottom-nav.tsx` - persistent bottom navigation.
- `src/lib/coming-soon.ts` - `comingSoon()` toast helper.
- `src/app/profile/page.tsx` - new Profile page hosting `SettingsForm` + `SystemPromptEditor`.
- `src/app/journey/page.tsx` - new coming-soon page.

**Modified files:**
- `src/app/globals.css` - rewrite color tokens as warm HSL.
- `src/app/layout.tsx` - remove ThemeProvider, add Nunito font, full-height column with BottomNav.
- `src/components/theme-provider.tsx` - DELETE.
- `src/components/app-header.tsx` - DELETE (replaced by per-page headers + BottomNav).
- `src/components/ui/sonner.tsx` - hardcode `theme="dark"`, remove `useTheme`.
- `src/components/reader/reader-topbar.tsx` - remove the theme toggle dropdown only.
- `tailwind.config.ts` - point `fontFamily.sans` at the Nunito variable.
- `src/app/manifest.ts` - update `theme_color` / `background_color`.
- `src/components/books/book-card.tsx` - rewrite as an upright 2/3 book on the shelf with real or generated cover, progress line, and a BookMenu trigger.
- `src/components/books/bookshelf.tsx` - rewrite as wooden shelf rows with planks, adaptive books-per-row hook, dnd reorder across rows, empty state vase.
- `src/app/page.tsx` - rewrite as the showcase bookshelf (header + pills + shelf).
- `src/app/persona/page.tsx`, `src/app/persona/new/page.tsx`, `src/app/persona/edit/page.tsx` - add warm in-page headers; reuse `PersonaForm` and `PersonaCard` as-is.
- `src/app/settings/page.tsx` - replace with a client redirect to `/profile`.
- `src/components/settings/system-prompt-editor.tsx` - replace the em-dash in the error toast with a period (spec: no em-dashes in shipped strings).
- `DESIGN.md` - update palette, font, theme lock, and navigation section.

Files not touched: all `src/lib/storage/*`, `src/lib/ai.ts`, `src/lib/epub.ts`, `src/lib/import-book.ts`, `src/lib/prompts.ts`, `src/lib/selection.ts`, `src/lib/txt.ts`, `src/lib/word-count.ts`, `src/lib/types.ts`, all reader components except `reader-topbar.tsx`, all `src/components/ui/*` except `sonner.tsx` (they re-theme via tokens), `src/components/books/book-menu.tsx`, `src/components/books/import-button.tsx`, `src/components/persona/*`, `src/components/settings/*` except the one toast fix, the PWA registration, and the vitest tests.

---

## Task 1: Warm theme tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:** Produces a single warm dark palette as HSL channel triplets on the existing shadcn token names, consumed by every `ui/*` component via `tailwind.config.ts` (`hsl(var(--token))`). No `.dark` variant.

- [ ] **Step 1: Replace the entire `@layer base { :root { ... } .dark { ... } }` block with a single warm `:root` block**

Replace the `:root { ... }` and `.dark { ... }` declarations (current lines 6-48) with this single block:

```css
@layer base {
  :root {
    --background: 24 60% 7%;          /* #1C0F07 charred wood - app shell / shelf wall */
    --foreground: 35 61% 85%;        /* #F0DCC0 cream text */
    --card: 30 58% 9%;               /* #26180A very dark brown - elevated surfaces */
    --card-foreground: 35 61% 85%;
    --popover: 30 58% 9%;
    --popover-foreground: 35 61% 85%;
    --primary: 28 49% 58%;           /* #C89060 amber accent */
    --primary-foreground: 24 60% 7%; /* dark on amber */
    --secondary: 21 58% 15%;         /* #3D2010 active nav pill bg */
    --secondary-foreground: 36 72% 67%; /* #E8B870 amber bright */
    --muted: 21 58% 15%;
    --muted-foreground: 29 42% 38%;  /* #8A6038 muted caramel */
    --accent: 29 49% 41%;            /* #9A6535 active pill bg */
    --accent-foreground: 41 59% 90%; /* #F5ECD8 active pill text */
    --destructive: 0 70% 50%;        /* warm red */
    --destructive-foreground: 41 59% 90%;
    --border: 28 35% 20%;            /* subtle warm border */
    --input: 28 35% 20%;
    --ring: 28 49% 58%;              /* amber focus ring */
    --radius: 0.625rem;
  }
}
```

Do not add a `.dark` block. The `html` element does not need a theme class.

- [ ] **Step 2: Leave the base element rules and keyframes alone**

Keep the existing `* { @apply border-border; }` and `body { @apply bg-background text-foreground; }` block, and the four keyframe + animation utility classes at the bottom of the file unchanged.

- [ ] **Step 3: Run the build to confirm tokens resolve**

Run: `npm run build`
Expected: build succeeds. (If `hsl(var(--background))` resolves to a warm dark color the build is fine; a color mismatch shows visually, not at build time.)

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "theme: replace slate tokens with warm dark bookshelf palette"
```

---

## Task 2: Nunito font

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `tailwind.config.ts`
- Modify: `src/app/manifest.ts`

**Interfaces:** Produces the `--font-nunito` CSS variable on `<html>` and makes Tailwind's `font-sans` resolve to Nunito. Consumed by the whole app.

- [ ] **Step 1: Add Nunito to layout.tsx imports**

In `src/app/layout.tsx`, replace the Geist imports:

```ts
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
```

with:

```ts
import { Nunito } from 'next/font/google';
```

And add the Nunito config above `metadata`:

```ts
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});
```

- [ ] **Step 2: Apply the variable to `<html>`**

In the same file, change the `<html>` opening tag from:

```tsx
<html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
```

to:

```tsx
<html lang="en" suppressHydrationWarning className={nunito.variable}>
```

- [ ] **Step 3: Point Tailwind fontFamily.sans at the Nunito variable**

In `tailwind.config.ts`, replace:

```ts
fontFamily: {
  sans: ['var(--font-geist-sans)', 'sans-serif'],
  mono: ['var(--font-geist-mono)', 'monospace'],
},
```

with:

```ts
fontFamily: {
  sans: ['var(--font-nunito)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
},
```

- [ ] **Step 4: Update manifest theme/background colors**

In `src/app/manifest.ts`, change:

```ts
background_color: '#ffffff',
theme_color: '#ffffff',
```

to:

```ts
background_color: '#0A0603',
theme_color: '#1C0F07',
```

- [ ] **Step 5: Run the build and confirm Nunito is bundled**

Run: `npm run build`
Expected: build succeeds with no font fetch errors. (Next downloads and self-hosts Nunito at build time. If the build machine is offline, stop and switch to `@fontsource/nunito` as documented in the spec section 11, then re-run.)

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx tailwind.config.ts src/app/manifest.ts
git commit -m "theme: switch font to Nunito, update PWA colors"
```

---

## Task 3: Remove next-themes (dark-only, no flash)

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/ui/sonner.tsx`
- Modify: `src/components/reader/reader-topbar.tsx`
- Delete: `src/components/theme-provider.tsx`

**Interfaces:** Removes the `next-themes` runtime dependency from the app shell. After this task, `useTheme` is not imported anywhere except possibly unused; the Toaster uses a fixed dark theme; the reader topbar no longer toggles theme.

- [ ] **Step 1: Drop ThemeProvider from layout.tsx**

In `src/app/layout.tsx`, remove the import and the component wrapper:

```tsx
import { ThemeProvider } from '@/components/theme-provider';
```
```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  ...
</ThemeProvider>
```

Replace with just its children wrapped in the body. The final `RootLayout` body should look like:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <body className="flex min-h-[100dvh] flex-col bg-background font-sans antialiased">
        {children}
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </body>
    </html>
  );
}
```

(The `AppHeader` import and usage and `bg-background` are adjusted further in Task 5; leave `AppHeader` in place for now if present - it is removed in Task 5. If you remove `AppHeader` here for cleanliness, that is also fine, but do not add `BottomNav` yet.)

Note: `suppressHydrationWarning` stays because next-themes is gone but it is harmless to keep; removing it is also fine.

- [ ] **Step 2: Delete theme-provider.tsx**

Delete the file `src/components/theme-provider.tsx`. If anything still imports it, the build will fail in Step 5 - fix by removing that import (there should be none after Step 1).

- [ ] **Step 3: Hardcode the Toaster theme to dark**

In `src/components/ui/sonner.tsx`, replace the whole file with:

```tsx
"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
```

- [ ] **Step 4: Remove the theme toggle from reader-topbar.tsx**

In `src/components/reader/reader-topbar.tsx`:
- Remove the `import { useTheme } from 'next-themes';` line.
- Remove `Moon, Sun, Monitor` from the lucide import (keep `ChevronLeft, List, Bookmark, Type`).
- Remove the entire `DropdownMenu` import block:
  ```tsx
  import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
  ```
- Remove the `const { setTheme } = useTheme();` line.
- Remove the entire `<DropdownMenu>...</DropdownMenu>` block (current lines 36-48) from the JSX.

The final `ReaderTopbar` JSX right section becomes:

```tsx
<div className="flex items-center">
  <Button variant="ghost" size="icon" onClick={onBookmarks} aria-label="Bookmarks">
    <Bookmark className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={onToc} aria-label="Table of contents">
    <List className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Reader settings">
    <Type className="h-4 w-4" />
  </Button>
</div>
```

- [ ] **Step 5: Build to confirm no next-themes references remain**

Run: `npm run build`
Expected: build succeeds with no "Module not found: next-themes" or unused-import errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/components/ui/sonner.tsx src/components/reader/reader-topbar.tsx
git rm src/components/theme-provider.tsx
git commit -m "theme: remove next-themes, force dark only"
```

---

## Task 4: Update DESIGN.md

**Files:**
- Modify: `DESIGN.md`

**Interfaces:** None. Documentation only, keeps `DESIGN.md` aligned with the new system (AGENTS.md requires docs stay current).

- [ ] **Step 1: Rewrite the Colors section of DESIGN.md**

Replace the existing "## Colors" / "### Primary Palette" table with a warm palette table mirroring the tokens from Task 1:

```markdown
## Colors

### Palette (dark only - locked)

One theme. No light mode.

| Token | Hex | Usage |
|---|---|---|
| `background` | `#1C0F07` | App shell, shelf wall |
| `foreground` | `#F0DCC0` | Cream primary text |
| `card` | `#26180A` | Elevated surfaces, dark wood cards |
| `primary` | `#C89060` | Amber accent (icons, links, focus) |
| `secondary` | `#3D2010` | Active nav pill bg |
| `secondary-foreground` | `#E8B870` | Active nav icon/label |
| `muted-foreground` | `#8A6038` | Muted caramel secondary text |
| `accent` | `#9A6535` | Active filter pill bg |
| `accent-foreground` | `#F5ECD8` | Active filter pill text |
| `destructive` | warm red | Error states |
| `border` | warm 28 35% 20% | Borders, inputs |

Shelf plank gradient: `linear-gradient(to bottom, #9A5A28 0%, #7A4020 35%, #8C5028 65%, #632E14 100%)`.
Outer desktop canvas: `#0A0603`.
```

- [ ] **Step 2: Update the Typography section**

Replace the Font Families table:

```markdown
### Font Families

| Token | Font | Usage |
|---|---|---|
| `--font-nunito` | Nunito (400-800) | All UI text |
```

- [ ] **Step 3: Update the Dark Mode and Layout root sections**

Under "## Dark Mode", replace the contents with:

```markdown
## Dark Mode

- Dark only. No light mode, no system toggle.
- `next-themes` removed; the warm palette is the single `:root` token set.
```

Under "### Root Structure", replace with:

```markdown
### Root Structure

\`\`\`
<body class="antialiased min-h-[100dvh] flex flex-col bg-background">
  <main class="flex-1">{children}</main>
  <BottomNav />
</body>
\`\`\`
```

(Keep the rest of DESIGN.md unchanged unless it contradicts a value above.)

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md
git commit -m "docs: update DESIGN.md to warm dark bookshelf system"
```

---

## Task 5: Bottom navigation and app frame

**Files:**
- Create: `src/components/bottom-nav.tsx`
- Create: `src/lib/coming-soon.ts`
- Modify: `src/app/layout.tsx`
- Delete: `src/components/app-header.tsx`

**Interfaces:**
- Produces: `BottomNav` (default export-free named export) rendering nothing on `/read`; `comingSoon(msg?: string): void` that fires a sonner toast.
- Consumes: `usePathname()` from `next/navigation`, `toast` from `sonner`, lucide icons.

- [ ] **Step 1: Create the coming-soon helper**

Create `src/lib/coming-soon.ts`:

```ts
import { toast } from 'sonner';

export function comingSoon(label?: string) {
  toast(label ? `${label} is coming soon` : 'Coming soon');
}
```

- [ ] **Step 2: Create the BottomNav component**

Create `src/components/bottom-nav.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Fingerprint, BookMarked, CircleUser } from 'lucide-react';

const ITEMS = [
  { href: '/journey', label: 'Journey', icon: Compass },
  { href: '/persona', label: 'Persona', icon: Fingerprint },
  { href: '/', label: 'Bookshelf', icon: BookMarked },
  { href: '/profile', label: 'Profile', icon: CircleUser },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/read')) return null;
  return (
    <nav
      className="sticky bottom-0 z-40 flex shrink-0 items-end justify-around border-t border-border/60 bg-background/95 backdrop-blur"
      style={{
        paddingTop: 10,
        paddingBottom: 'max(1.4rem, env(safe-area-inset-bottom, 1.4rem))',
      }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex min-w-[64px] flex-col items-center gap-1 transition-colors"
            aria-current={active ? 'page' : undefined}
          >
            <span
              className="flex items-center justify-center rounded-full transition-colors"
              style={{
                padding: active ? '7px 20px' : '8px',
                borderRadius: 22,
                background: active ? 'hsl(var(--secondary))' : 'transparent',
                color: active ? 'hsl(var(--secondary-foreground))' : '#6A5030',
              }}
            >
              <Icon size={20} strokeWidth={2} />
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: active ? 'hsl(var(--secondary-foreground))' : '#6A5030' }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Restructure layout.tsx to use BottomNav and remove AppHeader**

In `src/app/layout.tsx`:
- Remove the `import { AppHeader } from '@/components/app-header';` line.
- Remove the `<AppHeader />` line.
- Add `import { BottomNav } from '@/components/bottom-nav';`.
- Change `<main className="flex-1">{children}</main>` to `<main className="flex flex-1 flex-col">{children}</main>`.

Final `RootLayout`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <body className="flex min-h-[100dvh] flex-col bg-background font-sans antialiased">
        <main className="flex flex-1 flex-col">{children}</main>
        <BottomNav />
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Delete app-header.tsx**

Delete `src/components/app-header.tsx`. (Task 3's reader-topbar and all other components do not import it.)

- [ ] **Step 5: Build and confirm the shell renders**

Run: `npm run build`
Expected: build succeeds with no "Module not found" for `app-header` or `theme-provider`.

- [ ] **Step 6: Manual visual check**

Run: `npm run dev` and open the app at a phone width (about 390px) and desktop width. Confirm:
- Bottom navigation visible on `/`, `/persona`, hidden on `/read` (the reader has its own topbar).
- Active tab is highlighted amber when on `/`, `/persona`, `/profile`, `/journey`.

- [ ] **Step 7: Commit**

```bash
git add src/components/bottom-nav.tsx src/lib/coming-soon.ts src/app/layout.tsx
git rm src/components/app-header.tsx
git commit -m "frame: add bottom navigation, remove top app header"
```

---

## Task 6: Generated cover motifs (port from Figma) and color picker

**Files:**
- Create: `src/components/books/motifs.tsx`
- Create: `src/components/books/generated-cover.tsx`
- Create: `src/lib/book-motifs.ts`
- Create: `src/lib/__tests__/book-motifs.test.ts`

**Interfaces:**
- Produces: `MotifSVG`, `VaseDecoration` (presentational, verbatim ported). `pickCoverStyle(seed: string): { bg: string; textColor: string; accentColor: string; motif: MotifType }`. `MotifType` exported from `src/lib/book-motifs.ts`.
- Consumes: the Figma `App.tsx` reference for the verbatim port.

- [ ] **Step 1: Create the MotifType union and the deterministic picker**

Create `src/lib/book-motifs.ts`:

```ts
export type MotifType =
  | 'leaf' | 'arch-branch' | 'arch-tree' | 'large-leaf'
  | 'waves' | 'abstract' | 'forest' | 'sunset' | 'moon' | 'botanical-circle';

interface CoverStyle {
  bg: string;
  textColor: string;
  accentColor: string;
  motif: MotifType;
}

const STYLES: CoverStyle[] = [
  { bg: '#C4875A', textColor: '#FAEBD7', accentColor: 'rgba(250,235,215,0.55)', motif: 'leaf' },
  { bg: '#E0C898', textColor: '#4A3218', accentColor: 'rgba(74,50,24,0.45)',    motif: 'arch-branch' },
  { bg: '#44260E', textColor: '#D8B88A', accentColor: 'rgba(210,165,85,0.55)',  motif: 'arch-tree' },
  { bg: '#CC8A62', textColor: '#FAEBD7', accentColor: 'rgba(250,235,215,0.5)',  motif: 'large-leaf' },
  { bg: '#26180A', textColor: '#B88A52', accentColor: 'rgba(185,140,82,0.6)',   motif: 'waves' },
  { bg: '#8A4820', textColor: '#F5D090', accentColor: 'rgba(245,208,144,0.55)', motif: 'abstract' },
  { bg: '#1C1C2E', textColor: '#8AAAD0', accentColor: 'rgba(138,170,208,0.65)', motif: 'forest' },
  { bg: '#783818', textColor: '#F5C060', accentColor: 'rgba(245,192,96,0.65)',  motif: 'sunset' },
  { bg: '#1A2E50', textColor: '#98B8D8', accentColor: 'rgba(152,184,216,0.65)', motif: 'moon' },
  { bg: '#284832', textColor: '#B0C8A0', accentColor: 'rgba(176,200,160,0.6)',  motif: 'botanical-circle' },
];

export function pickCoverStyle(seed: string): CoverStyle {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % STYLES.length;
  return STYLES[idx];
}

export const MOTIF_TYPES: MotifType[] = STYLES.map((s) => s.motif);
```

- [ ] **Step 2: Write the deterministic test first**

Create `src/lib/__tests__/book-motifs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickCoverStyle, MOTIF_TYPES } from '../book-motifs';

describe('pickCoverStyle', () => {
  it('returns the same style for the same seed every time', () => {
    const a = pickCoverStyle('book-1');
    const b = pickCoverStyle('book-1');
    expect(a).toEqual(b);
  });

  it('distributes different seeds across the motif set', () => {
    const motifs = new Set(MOTIF_TYPES);
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(pickCoverStyle(`book-${i}`).motif);
    }
    // at least half the motifs appear across 100 distinct seeds
    expect(seen.size).toBeGreaterThanOrEqual(MOTIF_TYPES.length / 2);
  });

  it('every style has a non-empty bg, textColor, accentColor, and a known motif', () => {
    for (const m of MOTIF_TYPES) {
      const s = pickCoverStyle(`seed-${m}`);
      expect(s.bg).toMatch(/^#/);
      expect(s.textColor.length).toBeGreaterThan(0);
      expect(s.accentColor.length).toBeGreaterThan(0);
      expect(MOTIF_TYPES).toContain(s.motif);
    }
  });
});
```

- [ ] **Step 3: Run the test and confirm it passes**

Run: `npm test`
Expected: `book-motifs.test.ts` passes.

- [ ] **Step 4: Port MotifSVG and VaseDecoration from the Figma reference verbatim**

Create `src/components/books/motifs.tsx` by copying the `MotifSVG` component (reference file `reference/Figma UI Reference - Reading app/reference/src/app/App.tsx`, lines 43-171) and the `VaseDecoration` component (same file, lines 220-246) VERBATIM. Adapt only the imports and the `MotifType` import to use the local type:

```tsx
import type { MotifType } from '@/lib/book-motifs';

export function MotifSVG({ type, color }: { type: MotifType; color: string }) {
  // ... body copied verbatim from reference lines 46-170
}

export function VaseDecoration() {
  // ... body copied verbatim from reference lines 223-245
}
```

Do not modify the SVG path data, opacities, or the `viewBox` attributes. The `<svg>` root of `MotifSVG` keeps `viewBox="0 0 80 120"` and `className="absolute inset-0 h-full w-full pointer-events-none"`.

- [ ] **Step 5: Create the GeneratedCover component**

Create `src/components/books/generated-cover.tsx`:

```tsx
'use client';
import { pickCoverStyle } from '@/lib/book-motifs';
import { MotifSVG } from './motifs';

export function GeneratedCover({ seed, title, tag }: { seed: string; title: string; tag?: string }) {
  const style = pickCoverStyle(seed);
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: style.bg, borderRadius: '2px 5px 5px 2px' }}
    >
      <MotifSVG type={style.motif} color={style.accentColor} />
      <div className="absolute inset-x-0 top-0 z-10 px-2 pt-3 text-center">
        <p
          className="break-words text-center font-bold uppercase leading-tight"
          style={{
            fontSize: 'clamp(6px, 1.6vw, 9px)',
            color: style.textColor,
            letterSpacing: '0.06em',
            textShadow: '0 1px 3px rgba(0,0,0,0.45)',
            hyphens: 'auto',
          }}
        >
          {title}
        </p>
        {tag ? (
          <p className="mt-1 opacity-70" style={{ fontSize: 'clamp(4px, 1.1vw, 6px)', color: style.textColor }}>
            {tag}
          </p>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Build to confirm types line up**

Run: `npm run build`
Expected: build succeeds; `MotifType` in `motifs.tsx` matches `book-motifs.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/book-motifs.ts src/lib/__tests__/book-motifs.test.ts src/components/books/motifs.tsx src/components/books/generated-cover.tsx
git commit -m "bookshelf: add generated cover motifs and deterministic style picker"
```

---

## Task 7: Rewrite BookCard as an upright shelf book

**Files:**
- Modify: `src/components/books/book-card.tsx`

**Interfaces:**
- Produces: `BookCard({ book, onChanged })` rendering a 2/3 upright book: real cover image when `book.coverRef` exists, otherwise `GeneratedCover`. Includes a small `BookMenu` trigger on hover/tap and a thin amber progress line.
- Consumes: `book.coverRef` via `idbGet`, `book.progress` / `book.chapterCount`, existing `BookMenu`, new `GeneratedCover`.

- [ ] **Step 1: Rewrite book-card.tsx**

Replace the entire contents of `src/components/books/book-card.tsx` with:

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { idbGet } from '@/lib/storage/idb';
import type { Book } from '@/lib/types';
import { BookMenu } from './book-menu';
import { GeneratedCover } from './generated-cover';

export function BookCard({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (book.coverRef) {
      void idbGet<Blob>(book.coverRef).then((blob) => {
        if (blob && !cancelled) {
          url = URL.createObjectURL(blob);
          setCoverUrl(url);
        }
      });
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [book.coverRef]);

  const progressFraction = book.progress && book.chapterCount > 0
    ? (Number(book.progress.chapterId) + 1) / book.chapterCount
    : 0;

  return (
    <div className="group relative flex-1 min-w-0" style={{ aspectRatio: '2 / 3' }}>
      <Link
        href={`/read?id=${book.id}`}
        className="absolute inset-0 block overflow-hidden transition-transform duration-200 hover:-translate-y-2 active:translate-y-0"
        style={{
          borderRadius: '2px 5px 5px 2px',
          boxShadow: '3px 0 6px rgba(0,0,0,0.45), inset -2px 0 4px rgba(0,0,0,0.25)',
        }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <GeneratedCover seed={book.id} title={book.title} tag={book.author || book.format.toUpperCase()} />
        )}
        {/* progress line at the bottom edge of the cover */}
        <span
          className="pointer-events-none absolute bottom-0 left-0 block h-[3px]"
          style={{
            width: `${Math.min(100, Math.max(0, progressFraction * 100))}%`,
            background: 'hsl(var(--secondary-foreground))',
          }}
          aria-hidden="true"
        />
      </Link>
      <div className="absolute right-1 top-1 z-20 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <BookMenu book={book} onChanged={onChanged} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to confirm imports resolve**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual visual check (after Task 8 wires the shelf)**

 Defer until Task 8 renders the shelf. Note here that the card is not meant to render standalone yet.

- [ ] **Step 4: Commit**

```bash
git add src/components/books/book-card.tsx
git commit -m "bookshelf: upright 2/3 book card with real/generated cover and progress line"
```

---

## Task 8: Rewrite Bookshelf as wooden shelf rows with adaptive counts and dnd

**Files:**
- Modify: `src/components/books/bookshelf.tsx`

**Interfaces:**
- Produces: `Bookshelf({ books, onChanged })` rendering wood-wall rows of `BookCard`s on plank dividers, adaptive books-per-row (3 / 4 / 5 / 6 by viewport), dnd reorder across rows, and a vase on the last row's empty final slot. Empty array renders `null` (the page-level empty state handles the true empty case).

- [ ] **Step 1: Rewrite bookshelf.tsx**

Replace the entire contents of `src/components/books/bookshelf.tsx` with:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Book } from '@/lib/types';
import { reorderBooks } from '@/lib/storage/books';
import { BookCard } from './book-card';
import { VaseDecoration } from './motifs';

const WALL_BG =
  'repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,190,80,0.012) 60px, rgba(255,190,80,0.012) 61px), hsl(var(--background))';

const PLANK_BG =
  'linear-gradient(90deg, rgba(255,200,100,0.06) 0%, rgba(255,200,100,0) 25%, rgba(255,200,100,0.04) 50%, rgba(255,200,100,0) 75%, rgba(255,200,100,0.05) 100%),' +
  'linear-gradient(to bottom, #9A5A28 0%, #7A4020 35%, #8C5028 65%, #632E14 100%)';

function usesBooksPerRow() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setN(w >= 1280 ? 6 : w >= 1024 ? 5 : w >= 640 ? 4 : 3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return n;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function SortableBook({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: book.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="flex-1 min-w-0"
    >
      <BookCard book={book} onChanged={onChanged} />
    </div>
  );
}

export function Bookshelf({ books, onChanged }: { books: Book[]; onChanged: () => void }) {
  const perRow = usesBooksPerRow();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = books.map((b) => b.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    reorderBooks(next);
    onChanged();
  };

  if (books.length === 0) return null;

  const rows = chunk(books, perRow);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={books.map((b) => b.id)} strategy={rectSortingStrategy}>
        <div style={{ background: WALL_BG }}>
          {rows.map((row, ri) => {
            const isLast = ri === rows.length - 1;
            const empties = perRow - row.length;
            return (
              <div key={ri} style={{ background: WALL_BG }}>
                <div className="flex items-end gap-2.5 px-3 pb-0 pt-4">
                  {row.map((b) => (
                    <SortableBook key={b.id} book={b} onChanged={onChanged} />
                  ))}
                  {isLast && empties > 0 ? (
                    <>
                      {Array.from({ length: Math.max(0, empties - 1) }).map((_, i) => (
                        <div key={`e-${i}`} className="flex-1" style={{ aspectRatio: '2 / 3' }} />
                      ))}
                      <VaseDecoration />
                    </>
                  ) : null}
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    height: 20,
                    marginTop: 2,
                    background: PLANK_BG,
                    boxShadow:
                      '0 7px 20px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,195,100,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)',
                  }}
                />
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual visual + interaction check (after Task 9 wires the page)**
 - Books stand upright on planks.
 - Dragging a book from row 1 to row 2 reorders; phone and desktop.
 - Vase appears on the last row's final empty slot.
 Validate after Task 9 is done.

- [ ] **Step 4: Commit**

```bash
git add src/components/books/bookshelf.tsx
git commit -m "bookshelf: wooden plank rows, adaptive counts, vase, dnd across rows"
```

---

## Task 9: Bookshelf page header, filter pills, and empty state

**Files:**
- Create: `src/components/books/book-header.tsx`
- Create: `src/components/books/filter-pills.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `BookHeader` (title, subtitle, Import + coming-soon Search/More icons). `FilterPills` (four pills, `value` / `onChange` for the active id; non-All pills fire `comingSoon`). The `/` page wires them and the `Bookshelf`.
- Consumes: existing `ImportButton`, `comingSoon`, lucide icons.

- [ ] **Step 1: Create BookHeader**

Create `src/components/books/book-header.tsx`:

```tsx
'use client';
import { Plus, Search, MoreVertical } from 'lucide-react';
import { ImportButton } from './import-button';

export function BookHeader({ onImported }: { onImported: () => void }) {
  return (
    <header className="flex flex-shrink-0 items-center px-4 pb-3 pt-6">
      <div className="flex-1 px-1">
        <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))', letterSpacing: '-0.01em' }}>
          My Bookshelf
        </h1>
        <p className="mt-0.5 text-xs font-medium" style={{ color: '#8A6038' }}>
          Your journey begins here
        </p>
      </div>
      <div className="flex items-center gap-1">
        {/* Import: real working action */}
        <span className="text-foreground">
          <ImportButton onImported={onImported} />
        </span>
        {/* Search: coming soon */}
        <button
          type="button"
          aria-label="Search (coming soon)"
          onClick={() => { /* delegated below */ }}
          className="p-2 transition-colors hover:text-foreground"
          style={{ color: '#C89060' }}
        >
          <Search size={18} />
        </button>
        {/* More: coming soon */}
        <button
          type="button"
          aria-label="More (coming soon)"
          className="p-2 transition-colors hover:text-foreground"
          style={{ color: '#C89060' }}
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </header>
  );
}
```

Note: the Search and More buttons fire `comingSoon()` via wiring in Step 3, to keep this component self-driven by props is not necessary. For cleanliness, import `comingSoon` directly in the component instead of inline comments:

Replace the two `onClick={() => { /* delegated below */ }}` and the unused comment lines by importing `comingSoon` and calling it. Concretely, add at the top:

```tsx
import { comingSoon } from '@/lib/coming-soon';
```

and set:

```tsx
onClick={() => comingSoon('Search')}
```
and for the More button:

```tsx
onClick={() => comingSoon('More')}
```

Remove the unused `Plus` import (it is not used here; `ImportButton` already shows its own plus). Final imports: `import { Search, MoreVertical } from 'lucide-react';`.

- [ ] **Step 2: Create FilterPills**

Create `src/components/books/filter-pills.tsx`:

```tsx
'use client';
import { BookMarked, Heart, Bookmark, Check } from 'lucide-react';
import { comingSoon } from '@/lib/coming-soon';

export type FilterId = 'all' | 'favorites' | 'toread' | 'finished';

const PILLS: { id: FilterId; label: string; icon: typeof BookMarked }[] = [
  { id: 'all',       label: 'All Books', icon: BookMarked },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'toread',    label: 'To Read',   icon: Bookmark },
  { id: 'finished',  label: 'Finished',  icon: Check },
];

export function FilterPills({ value, onChange }: { value: FilterId; onChange: (id: FilterId) => void }) {
  return (
    <div className="flex flex-shrink-0 gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: 'none' }}>
      {PILLS.map((p) => {
        const active = value === p.id;
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => (p.id === 'all' ? onChange('all') : comingSoon(p.label))}
            className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors"
            style={{
              padding: '6px 14px',
              fontSize: 13,
              background: active ? 'hsl(var(--accent))' : 'rgba(255,255,255,0.065)',
              color: active ? 'hsl(var(--accent-foreground))' : '#9A7048',
              border: active ? 'none' : '1px solid rgba(200,150,75,0.18)',
            }}
          >
            <Icon size={13} strokeWidth={active ? 2.5 : 2} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite the bookshelf page**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { Book } from '@/lib/types';
import { listBooks } from '@/lib/storage/books';
import { Bookshelf } from '@/components/books/bookshelf';
import { BookHeader } from '@/components/books/book-header';
import { FilterPills, type FilterId } from '@/components/books/filter-pills';
import { VaseDecoration } from '@/components/books/motifs';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filter, setFilter] = useState<FilterId>('all');
  const refresh = useCallback(() => setBooks(listBooks()), []);
  useEffect(refresh, [refresh]);

  const visible = filter === 'all' ? books : books; // only 'all' is functional; others never set this (coming soon)

  return (
    <div className="mx-auto flex w-full max-w-[1024px] flex-1 flex-col">
      <BookHeader onImported={refresh} />
      <FilterPills value={filter} onChange={setFilter} />
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {books.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="w-full max-w-[160px]" style={{ aspectRatio: '2 / 3' }}>
              <VaseDecoration />
            </div>
            <BookOpen className="h-10 w-10" style={{ color: '#C89060' }} />
            <p style={{ color: '#9A7048' }}>No books yet. Import an EPUB or TXT file to start reading.</p>
            <span className="text-foreground">
              {/* ImportButton handled in header; this is a secondary CTA */}
            </span>
          </div>
        ) : (
          <Bookshelf books={visible} onChanged={refresh} />
        )}
      </div>
    </div>
  );
}
```

Note on imports: remove `visible`'s redundant line and the empty secondary CTA span if it reads as dead code - simplification:

Replace the `visible` line and the empty-state block:

- Use `const visible = books;` (since only `all` is functional now), and drop the comment.
- In the empty state, remove the empty `<span>` with the comment; the header already has the working Import button. Keep the vase, icon, and message.

Final cleaner `src/app/page.tsx`:

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { Book } from '@/lib/types';
import { listBooks } from '@/lib/storage/books';
import { Bookshelf } from '@/components/books/bookshelf';
import { BookHeader } from '@/components/books/book-header';
import { FilterPills, type FilterId } from '@/components/books/filter-pills';
import { VaseDecoration } from '@/components/books/motifs';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filter, setFilter] = useState<FilterId>('all');
  const refresh = useCallback(() => setBooks(listBooks()), []);
  useEffect(refresh, [refresh]);

  return (
    <div className="mx-auto flex w-full max-w-[1024px] flex-1 flex-col">
      <BookHeader onImported={refresh} />
      <FilterPills value={filter} onChange={setFilter} />
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {books.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="w-full max-w-[160px]" style={{ aspectRatio: '2 / 3' }}>
              <VaseDecoration />
            </div>
            <BookOpen className="h-10 w-10" style={{ color: '#C89060' }} />
            <p style={{ color: '#9A7048' }}>No books yet. Import an EPUB or TXT file to start reading.</p>
          </div>
        ) : (
          <Bookshelf books={books} onChanged={refresh} />
        )}
      </div>
    </div>
  );
}
```

(`filter` state is retained so that `FilterPills` shows the active `All Books` pill; non-All pills never call `onChange` because they fire `comingSoon` instead.)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Add bottom padding on the shelf column so the sticky nav never overlaps the last plank**

In `src/app/page.tsx`, wrap the shelf scroll container with `pb-24` (or `pb-28`) on the scroll div so the sticky bottom nav does not cover the last plank. Concretely, change:

```tsx
<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
```
to:
```tsx
<div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>
```

- [ ] **Step 6: Manual visual + interaction check**

Run: `npm run dev`. Confirm at phone (~390px) and desktop widths:
- Header shows "My Bookshelf" + subtitle; Import works; Search and More show "Coming soon" toasts.
- Filter pills show four pills; only "All Books" is active and functional; the others show "Coming soon".
- Books stand on planks; vase on the last row's empty slot.
- Drag reorder works across rows on phone and desktop.
- Tapping a book opens the reader; the bottom nav is hidden in the reader.
- A newly imported book with no cover shows a generated motif cover; one with a cover shows the real image.

- [ ] **Step 7: Commit**

```bash
git add src/components/books/book-header.tsx src/components/books/filter-pills.tsx src/app/page.tsx
git commit -m "bookshelf: showcase page with header, filter pills, and empty state"
```

---

## Task 10: Persona screens warm headers

**Files:**
- Modify: `src/app/persona/page.tsx`
- Modify: `src/app/persona/new/page.tsx`
- Modify: `src/app/persona/edit/page.tsx`

**Interfaces:** None new. Reuses `PersonaCard`, `PersonaForm`. Adds warm in-page headers consistent with the bookshelf header style.

- [ ] **Step 1: Wrap the persona list page in a warm column with a header**

Replace `src/app/persona/page.tsx` contents with:

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Persona } from '@/lib/types';
import { listPersonas } from '@/lib/storage/personas';
import { PersonaCard } from '@/components/persona/persona-card';

export default function PersonaListPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const refresh = useCallback(() => setPersonas(listPersonas()), []);
  useEffect(refresh, [refresh]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="flex flex-shrink-0 items-center justify-between px-4 pb-4 pt-6">
        <div className="px-1">
          <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
            Persona
          </h1>
          <p className="mt-0.5 text-xs font-medium" style={{ color: '#8A6038' }}>
            Your reading companions
          </p>
        </div>
        <Button asChild>
          <Link href="/persona/new"><Plus className="mr-1.5 h-4 w-4" />New persona</Link>
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        {personas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10" style={{ color: '#C89060' }} />
            <p>No companions yet. Create one, a detective, a poet, a grumpy cat, anyone you would like to read with.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {personas.map((p) => <PersonaCard key={p.id} persona={p} onChanged={refresh} />)}
          </div>
        )}
      </div>
    </div>
  );
}
```

(Note: the em-dash-free copy in the empty state replaces the original string.)

- [ ] **Step 2: Wrap the new-persona page in a warm column with a header**

Replace `src/app/persona/new/page.tsx` contents with:

```tsx
'use client';
import { PersonaForm } from '@/components/persona/persona-form';

export default function NewPersonaPage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="px-4 pb-4 pt-6">
        <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
          New companion
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        <PersonaForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wrap the edit-persona page in a warm column with a header**

Replace the JSX return inside `EditInner` (after the `persona === null` check) in `src/app/persona/edit/page.tsx` with:

```tsx
return (
  <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
    <header className="px-4 pb-4 pt-6">
      <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
        Edit companion
      </h1>
    </header>
    <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
      <PersonaForm persona={persona} />
    </div>
  </div>
);
```

Keep the surrounding `Suspense` wrapper and `EditInner` logic unchanged.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual visual check**

Run: `npm run dev`. Confirm the persona list, new, and edit pages render warm with the new headers; create/edit/delete still work via the existing components; bottom nav highlights Persona.

- [ ] **Step 6: Commit**

```bash
git add src/app/persona/page.tsx src/app/persona/new/page.tsx src/app/persona/edit/page.tsx
git commit -m "persona: warm in-page headers and column layout"
```

---

## Task 11: Profile page

**Files:**
- Create: `src/app/profile/page.tsx`
- Modify: `src/components/settings/system-prompt-editor.tsx`

**Interfaces:** None new. Reuses `SettingsForm` and `SystemPromptEditor` as-is on top of the warm column.

- [ ] **Step 1: Create the profile page**

Create `src/app/profile/page.tsx`:

```tsx
'use client';
import { SettingsForm } from '@/components/settings/settings-form';
import { SystemPromptEditor } from '@/components/settings/system-prompt-editor';

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="px-4 pb-4 pt-6">
        <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
          Profile
        </h1>
        <p className="mt-0.5 text-xs font-medium" style={{ color: '#8A6038' }}>
          App and provider settings
        </p>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        <SettingsForm />
        <SystemPromptEditor />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the em-dash in the system prompt editor error toast**

In `src/components/settings/system-prompt-editor.tsx`, change the toast message from:

```ts
toast.error('Template must contain {{personas}} — that is where companion profiles are inserted');
```
to:
```ts
toast.error('Template must contain {{personas}}. That is where companion profiles are inserted.');
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual visual check**

Run: `npm run dev`. Open `/profile`. Confirm the two forms render warm, save buttons and "Test connection" still work, bottom nav highlights Profile, and the template-error toast (trigger by saving a template without `{{personas}}`) shows the em-dash-free message.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/page.tsx src/components/settings/system-prompt-editor.tsx
git commit -m "profile: new page hosting settings; fix em-dash in toast"
```

---

## Task 12: `/settings` redirects to `/profile`

**Files:**
- Modify: `src/app/settings/page.tsx`

**Interfaces:** None. `/settings` becomes a client redirect page (static export has no server redirects).

- [ ] **Step 1: Replace settings/page.tsx with a client redirect**

Replace the entire contents of `src/app/settings/page.tsx` with:

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile');
  }, [router]);
  return null;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds; `/settings/index.html` is still generated (static export).

- [ ] **Step 3: Manual check**

Run: `npm run dev`. Visit `/settings` and confirm it forwards to `/profile`.

- [ ] **Step 4: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "settings: client redirect to /profile"
```

---

## Task 13: Journey coming-soon page

**Files:**
- Create: `src/app/journey/page.tsx`

**Interfaces:** None.

- [ ] **Step 1: Create the journey page**

Create `src/app/journey/page.tsx`:

```tsx
'use client';
import { Compass } from 'lucide-react';

export default function JourneyPage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="px-4 pb-4 pt-6">
        <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
          Journey
        </h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Compass size={56} strokeWidth={1.5} style={{ color: '#C89060' }} />
        <p className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Journey is coming soon
        </p>
        <p className="max-w-sm text-sm" style={{ color: '#8A6038' }}>
          Your reading path and milestones will live here. For now, pick a book from the shelf and start reading.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

Run: `npm run dev`. Visit `/journey`. Confirm the page renders warm with the Compass icon and the coming-soon copy; bottom nav highlights Journey.

- [ ] **Step 4: Commit**

```bash
git add src/app/journey/page.tsx
git commit -m "journey: coming-soon placeholder page"
```

---

## Task 14: Full verification

**Files:** None modified. Verification only.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: passes with no errors. Fix any unused-import or undefined-variable issues before continuing.

- [ ] **Step 2: Build under static export**

Run: `npm run build`
Expected: succeeds; `.next/` and `out/` generated without errors.

- [ ] **Step 3: Unit tests**

Run: `npm test`
Expected: all green, including the new `book-motifs.test.ts`.

- [ ] **Step 4: Em-dash audit**

Search the shipped UI strings for em-dash or en-dash characters. Run:

```bash
git grep -n '[—–]' -- 'src/app/**/*.tsx' 'src/components/**/*.tsx' || true
```

Expected: no matches in any user-visible string. (The `system-prompt-editor.tsx` em-dash was already fixed in Task 11.) If any remain in a user-visible string, replace with a hyphen, period, or comma and commit the fix.

- [ ] **Step 5: Manual cross-width visual check**

Run: `npm run dev`. Walk the app at three widths: phone (~390px), tablet (~768px), desktop (~1280px). Confirm:

- `/` Bookshelf: header, pills, adaptive books per row (3 / 4 / 5 / 6), plank shadows, vase, drag reorder across rows, tap to read, import, menu, progress line, empty state.
- `/persona`, `/persona/new`, `/persona/edit`: warm cards and forms, create/edit/delete still work.
- `/profile`: settings forms save, "Test connection" works, template-error toast is em-dash-free.
- `/journey`: placeholder renders.
- `/settings`: forwards to `/profile`.
- `/read`: layout unchanged, colors warm dark, theme toggle is gone, bookmarks / TOC / reader settings buttons still work, bottom nav is hidden.
- Bottom nav highlights the correct tab on each route, stays visible, respects safe-area on mobile.

- [ ] **Step 6: Contrast sanity check**

Verify on the warm dark theme that: cream text on the shell background is legible; amber focus rings are visible on inputs; pill labels and nav labels meet 4.5:1. Fix token values (in `globals.css`) if any surface fails, rebuild, and re-check.

- [ ] **Step 7: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "ui-revamp: verification fixes"
```

If no fixes were needed, no commit is required. The revamp is done when every step above passes.

---

## Self-review notes

- Spec coverage: every spec section is implemented. Section 4 (theme) is Tasks 1-4. Section 5 (frame) is Task 5. Section 6.1 (bookshelf) is Tasks 6-9. Sections 6.2, 6.3, 6.5, 6.6 are Tasks 10-13 (reader topbar theme toggle removal is Task 3, step 4). Section 7 (coming-soon) is Task 5 (helper) wired in Tasks 9. Section 8 (responsive + a11y) is enforced by the column widths, `min-h-[100dvh]`, focus rings via `--ring`, and the em-dash audit in Task 14. Section 9 (untouched) is honored by the file lists. Section 10 (verification) is Task 14.
- Placeholder scan: no "TBD" or "implement later". Where the plan references the Figma reference file for a verbatim port (Task 6, Step 4), exact line ranges are given; that is a concrete instruction, not a placeholder.
- Type consistency: `pickCoverStyle(seed: string)` returns `{ bg, textColor, accentColor, motif }` consumed identically by `GeneratedCover` (Task 6) and indirectly by `BookCard` (Task 7). `FilterId`, `BookHeader`, `FilterPills`, `comingSoon` signatures are used consistently across Tasks 5, 9. `usesBooksPerRow` returns a number consumed by `chunk` in `Bookshelf` (Task 8).
- The `filter` state in `src/app/page.tsx` is intentionally retained even though only `all` is functional, so `FilterPills` can render an active pill; the plan notes this explicitly.