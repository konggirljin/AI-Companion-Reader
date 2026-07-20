# AI Reading Companion MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA where users read EPUB/TXT books alongside customizable AI personas that comment on selected passages via 段评-style paragraph bubbles.

**Architecture:** 100% client-side Next.js 14 static export (`output: 'export'`). Books parsed in-browser (JSZip + DOMParser), stored in IndexedDB; metadata/personas/comments in localStorage. Browser calls the user's OpenAI-compatible endpoint directly. No server routes — keeps Vercel deploy and future Capacitor/TWA Android wrap possible.

**Tech Stack:** Next.js 14.2.x, React 18, TypeScript, Tailwind CSS 3.4, shadcn/ui (new-york), next-themes, lucide-react, JSZip, idb-keyval, @dnd-kit (sortable), @ducanh2912/next-pwa, Vitest + jsdom, geist font package.

**Spec:** `docs/superpowers/specs/2026-07-20-ai-reading-companion-mvp-design.md` (approved). **Design system:** `DESIGN.md`.

**Approved deviations from spec (do not "fix" these during review):**
- Query-param routes (`/read?id=`, `/persona/edit?id=`) instead of `[id]` folder routes — required by static export. Persona create route is `/persona/new`.
- Vitest unit tests for `src/lib/**` (user approved after spec).
- TXT heading-less fallback chunks by 500 paragraphs instead of ~10k chars (anchor-friendlier).
- `Book` adds `chapterCount`; `Paragraph.images` stores zip `path` + chapter-level blobs (not blob URLs); stored chapters omit `bookId` (conveyed by idb key).
- Settings page includes an unspecced "Test connection" button.

## Global Constraints

- All components are client components (`'use client'`); NO Next.js API routes, NO server-side data fetching.
- `next.config.mjs` must set `output: 'export'` and `images: { unoptimized: true }`.
- Dynamic book/persona IDs use **query-param routes** (`/read?id=…`, `/persona/edit?id=…`), never `[id]` folder routes (static export cannot pre-render runtime IDs). Pages using `useSearchParams` wrap their content in `<Suspense>`.
- Paragraph ID format: `"${chapterIndex}:${paragraphIndex}"` (both 0-based integers). Chapter ID: `String(chapterIndex)`. These IDs anchor comments/bookmarks — never regenerate them from a different parse order.
- Max **5** personas per AI request. Max **2000 words** per selection (hard block with toast).
- AI request: single `POST {baseUrl}/chat/completions`, 60s AbortController timeout, 429 → 2 retries with 1s/3s backoff, malformed JSON → exactly 1 retry.
- API key stored only in localStorage, sent only to the user-configured baseUrl.
- localStorage keys are namespaced `arc:` (AI Reading Companion). IndexedDB database name: `arc-books`.
- UI follows `DESIGN.md` (shadcn new-york, oklch tokens, Geist fonts, `cn()` from `@/lib/utils`).
- Testing: Vitest for `src/lib/**` pure logic only (environment jsdom). UI verified manually per spec §11.
- Every commit after each task; commit style `feat:`, `fix:`, `test:` (repo starts at Task 1 with `git init`, default branch `main`).

## File Structure

```
src/
  app/
    layout.tsx                 — root: Geist fonts, ThemeProvider, AppHeader, Toaster
    page.tsx                   — bookshelf route
    globals.css                — Tailwind + DESIGN.md oklch tokens + reader CSS vars
    manifest.ts                — PWA manifest
    read/page.tsx              — reader route (?id=)
    persona/page.tsx           — persona list
    persona/new/page.tsx       — persona create
    persona/edit/page.tsx      — persona edit (?id=)
    settings/page.tsx          — settings
  components/
    ui/                        — shadcn generated (button card input textarea label dialog sheet
                                  popover dropdown-menu select slider avatar badge sonner skeleton separator)
    app-header.tsx             — logo, nav links (书架 Shelf / 伙伴 Personas / Settings), theme toggle
    theme-provider.tsx         — next-themes wrapper
    pwa-register.tsx           — registers /sw.js in production
    books/bookshelf.tsx        — grid + dnd-kit reorder
    books/book-card.tsx        — cover, title, progress %, BookMenu
    books/book-menu.tsx        — rename dialog, delete confirm
    books/import-button.tsx    — file input (.epub/.txt) + import orchestration + error toasts
    reader/reader-view.tsx     — chapter loading/rendering, scroll progress, image object URLs
    reader/reader-topbar.tsx   — back, book title, TOC/bookmarks/settings triggers
    reader/toc-drawer.tsx      — Sheet with auto-extracted TOC
    reader/bookmarks-panel.tsx — Sheet with bookmark list
    reader/reader-settings.tsx — popover: font size, font family, line spacing
    reader/selection-toolbar.tsx — floating "Send to AI" + PersonaPicker
    reader/persona-picker.tsx  — multi-select up to 5 personas
    reader/comment-bubble.tsx  — 💬 count badge at paragraph end
    reader/comment-popover.tsx — comments grouped by persona, latest thread first
    persona/persona-card.tsx
    persona/persona-form.tsx   — create/edit, avatar resize to 256px base64
    settings/settings-form.tsx — baseUrl/apiKey/model + "Test connection"
    settings/system-prompt-editor.tsx — template textarea + reset-to-default
  lib/
    types.ts                   — all domain types + ParsedBook interfaces
    utils.ts                   — cn()
    storage/keys.ts            — localStorage key constants
    storage/local.ts           — typed localStorage read/write/remove with JSON guard
    storage/idb.ts             — idb-keyval wrapper (files, chapters, covers)
    storage/books.ts           — bookshelf meta: list/create/rename/delete/reorder/progress
    storage/personas.ts        — persona CRUD
    storage/threads.ts         — comment thread append/query, delete-on-book-delete
    storage/bookmarks.ts       — bookmark CRUD
    storage/settings.ts        — settings + reader prefs get/set, defaults
    epub.ts                    — parseEpub(ArrayBuffer) → ParsedBook
    txt.ts                     — parseTxt(ArrayBuffer) → ParsedBook
    import-book.ts             — importBook(File): parse → store idb → create Book meta
    prompts.ts                 — DEFAULT_SYSTEM_PROMPT_TEMPLATE, renderSystemPrompt(template, personas)
    ai.ts                      — sendToPersonas(), extractJson(), callChat()
    selection.ts               — resolveSelection(Range, container) → pids + NumberedParagraph[]
    word-count.ts              — countWords(text) (CJK-aware)
  lib/__tests__/               — vitest: epub.test.ts, txt.test.ts, ai.test.ts, selection.test.ts,
                                  storage.test.ts, word-count.test.ts, prompts.test.ts
public/
  icon.svg                     — source icon (simple book + speech bubble)
  icons/                       — generated PNGs via pwa-asset-generator
docs/superpowers/…             — spec + this plan
```

---
### Task 1: Project Scaffold + Design System

**Files:**
- Create: `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `vitest.config.ts`, `.gitignore` (via create-next-app)
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/manifest.ts`
- Create: `src/components/theme-provider.tsx`, `src/components/app-header.tsx`, `src/components/pwa-register.tsx`, `src/lib/utils.ts`
- Create: `public/icon.svg`

**Interfaces:**
- Produces: `cn()` from `@/lib/utils`; `ThemeProvider`; `AppHeader`; working `npm run dev` / `npm run build` / `npm test` scripts. All later tasks assume these exist.

- [ ] **Step 1: Initialize git + Next.js app**

Run in `D:\AI Companion Reader`:
```bash
git init -b main
npx create-next-app@14.2.5 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```
If prompted to overwrite existing files (`AGENTS.md`, `DESIGN.md`, `docs/`), answer **No** (keep them). Expected: `package.json` with `next: 14.2.5`, `src/app/` created.

- [ ] **Step 2: Install dependencies**

```bash
npm install jszip idb-keyval next-themes geist @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @ducanh2912/next-pwa
npm install -D vitest@2 @vitejs/plugin-react jsdom @types/node
```

- [ ] **Step 3: shadcn/ui init (non-interactive) + components**

```bash
npx shadcn@2.1.0 init -y -d
npx shadcn@2.1.0 add button card input textarea label dialog sheet popover dropdown-menu select slider avatar badge sonner skeleton separator
```
Expected: `components.json` (style `new-york`), `src/lib/utils.ts` with `cn()`, `src/components/ui/*`.

- [ ] **Step 4: Configure `next.config.mjs`**

Replace file content with:
```js
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: false, // we register manually in pwa-register.tsx
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default withPWA(nextConfig);
```

- [ ] **Step 5: Apply DESIGN.md tokens to `src/app/globals.css`**

Keep the Tailwind directives at top. Replace the `:root` / `.dark` blocks shadcn generated with the oklch values from `DESIGN.md` (copy verbatim):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.141 0.005 285.823);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.141 0.005 285.823);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.141 0.005 285.823);
    --primary: oklch(0.21 0.034 270);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.967 0.001 286.375);
    --secondary-foreground: oklch(0.21 0.006 285.885);
    --muted: oklch(0.967 0.001 286.375);
    --muted-foreground: oklch(0.552 0.016 285.938);
    --accent: oklch(0.96 0.012 270);
    --accent-foreground: oklch(0.21 0.006 285.885);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.985 0 0);
    --border: oklch(0.92 0.004 286.32);
    --input: oklch(0.92 0.004 286.32);
    --ring: oklch(0.21 0.034 270);
    --radius: 0.625rem;
  }
  .dark {
    --background: oklch(0.141 0.005 285.823);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.141 0.005 285.823);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.141 0.005 285.823);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.92 0.02 270);
    --primary-foreground: oklch(0.21 0.006 285.885);
    --secondary: oklch(0.274 0.006 286.033);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.274 0.006 286.033);
    --muted-foreground: oklch(0.705 0.015 286.067);
    --accent: oklch(0.28 0.018 270);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --destructive-foreground: oklch(0.985 0 0);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.92 0.02 270);
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

Also add the DESIGN.md keyframes at the end of the file:
```css
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in { animation: fade-in 0.3s ease-out; }
.animate-fade-up { animation: fade-up 0.4s ease-out; }
.animate-scale-in { animation: scale-in 0.2s ease-out; }
```

- [ ] **Step 6: `src/components/theme-provider.tsx`**

```tsx
'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 7: `src/components/app-header.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Users, Settings, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const links = [
  { href: '/', label: 'Shelf', icon: BookOpen },
  { href: '/persona', label: 'Personas', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppHeader() {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  if (pathname.startsWith('/read')) return null; // reader has its own topbar
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </span>
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text font-bold text-transparent">
            AI Reading Companion
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Button key={href} variant={pathname === href ? 'secondary' : 'ghost'} size="sm" asChild>
              <Link href={href} className="gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Theme">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}><Sun className="mr-2 h-4 w-4" />Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}><Moon className="mr-2 h-4 w-4" />Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}><Monitor className="mr-2 h-4 w-4" />System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 8: `src/components/pwa-register.tsx`**

```tsx
'use client';
import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
```

- [ ] **Step 9: `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/components/theme-provider';
import { AppHeader } from '@/components/app-header';
import { PwaRegister } from '@/components/pwa-register';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Reading Companion',
  description: 'Read together with AI companions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppHeader />
          <main className="flex-1">{children}</main>
          <Toaster richColors position="top-center" />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Ensure `tailwind.config.ts` fontFamily maps Geist:
```ts
fontFamily: {
  sans: ['var(--font-geist-sans)', 'sans-serif'],
  mono: ['var(--font-geist-mono)', 'monospace'],
},
```

- [ ] **Step 10: `src/app/manifest.ts` + `public/icon.svg`**

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Reading Companion',
    short_name: 'ARC',
    description: 'Read together with AI companions',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

`public/icon.svg` (simple book + bubble):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1c1b22"/>
  <path d="M128 160c0-17.7 14.3-32 32-32h96v256h-96c-17.7 0-32-14.3-32-32V160z" fill="#fff"/>
  <path d="M288 128h64c17.7 0 32 14.3 32 32v192c0 17.7-14.3 32-32 32h-64V128z" fill="#9d97b0"/>
  <path d="M320 224h88c13.3 0 24 10.7 24 24v56c0 13.3-10.7 24-24 24h-56l-32 32v-32h0c-13.3 0-24-10.7-24-24v-56c0-13.3 10.7-24 24-24z" fill="#fff" opacity="0.9"/>
</svg>
```

Generate PWA PNG icons:
```bash
npx pwa-asset-generator ./public/icon.svg ./public/icons --index false --icon-only --padding "10%"
```
Expected: `public/icons/icon-192.png` + `icon-512.png` (rename generated files to these names if needed).

- [ ] **Step 11: `src/app/page.tsx` placeholder + `vitest.config.ts`**

`src/app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Bookshelf</h1>
      <p className="mt-2 text-muted-foreground">Import a book to start reading with your AI companions.</p>
    </div>
  );
}
```

`vitest.config.ts` at project root:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, passWithNoTests: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Add `out/` to `.gitignore` if not present.

- [ ] **Step 12: Verify + commit**

```bash
npm run build
npm test
```
Expected: build completes, `out/` directory generated; vitest exits "no test files found" (passing). Dev server renders placeholder page with working theme toggle. Then:
```bash
git add -A
git commit -m "feat: scaffold Next.js 14 static export app with design system and PWA base"
```

---

### Task 2: Domain Types + Storage Layer

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/storage/keys.ts`, `src/lib/storage/local.ts`, `src/lib/storage/idb.ts`
- Create: `src/lib/storage/books.ts`, `src/lib/storage/personas.ts`, `src/lib/storage/threads.ts`, `src/lib/storage/bookmarks.ts`, `src/lib/storage/settings.ts`
- Test: `src/lib/__tests__/storage.test.ts`

**Interfaces:**
- Produces (all later tasks consume these exact signatures):
  - `types.ts`: `Book`, `TocEntry`, `Paragraph`, `Chapter`, `ChapterImage`, `ParsedBook`, `ParsedChapter`, `Persona`, `Thread`, `ThreadComment`, `Bookmark`, `Settings`, `ReaderPrefs`, `NumberedParagraph`, `AIComment`
  - `local.ts`: `readJson<T>(key: string, fallback: T): T`, `writeJson(key: string, value: unknown): void`, `removeKey(key: string): void`
  - `idb.ts`: `idbSet(key: string, value: unknown): Promise<void>`, `idbGet<T>(key: string): Promise<T | undefined>`, `idbDel(key: string): Promise<void>`, `idbDelMany(keys: string[]): Promise<void>`
  - `books.ts`: `listBooks(): Book[]`, `createBook(meta: Omit<Book,'addedAt'|'order'>): Book`, `renameBook(id: string, title: string): void`, `deleteBook(id: string): Promise<void>` (also removes idb chapters/file/cover + threads + bookmarks), `reorderBooks(orderedIds: string[]): void`, `saveProgress(bookId: string, chapterId: string, paragraphId: string): void`, `getBook(id: string): Book | undefined`
  - `personas.ts`: `listPersonas(): Persona[]`, `getPersona(id: string): Persona | undefined`, `savePersona(p: Omit<Persona,'id'|'createdAt'> & {id?: string}): Persona`, `deletePersona(id: string): void`
  - `threads.ts`: `listThreads(bookId: string, chapterId?: string): Thread[]`, `addThreads(threads: Thread[]): void`, `deleteThreadsForBook(bookId: string): void`
  - `bookmarks.ts`: `listBookmarks(bookId: string): Bookmark[]`, `addBookmark(b: Omit<Bookmark,'id'|'createdAt'>): Bookmark`, `deleteBookmark(id: string): void`, `deleteBookmarksForBook(bookId: string): void`
  - `settings.ts`: `getSettings(): Settings`, `saveSettings(s: Settings): void`, `getPrefs(): ReaderPrefs`, `savePrefs(p: ReaderPrefs): void`, `DEFAULT_SETTINGS`, `DEFAULT_PREFS`

- [ ] **Step 1: Write failing tests** — `src/lib/__tests__/storage.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readJson, writeJson, removeKey } from '@/lib/storage/local';
import { listBooks, createBook, renameBook, reorderBooks, saveProgress, getBook } from '@/lib/storage/books';
import { savePersona, listPersonas, deletePersona } from '@/lib/storage/personas';
import { addThreads, listThreads, deleteThreadsForBook } from '@/lib/storage/threads';
import { addBookmark, listBookmarks } from '@/lib/storage/bookmarks';
import { getSettings, saveSettings, getPrefs, savePrefs, DEFAULT_SETTINGS, DEFAULT_PREFS } from '@/lib/storage/settings';
import type { Thread } from '@/lib/types';

beforeEach(() => localStorage.clear());

describe('local.ts', () => {
  it('round-trips JSON values', () => {
    writeJson('arc:test', { a: 1 });
    expect(readJson('arc:test', null)).toEqual({ a: 1 });
  });
  it('returns fallback on missing or corrupt JSON', () => {
    expect(readJson('arc:missing', 'fb')).toBe('fb');
    localStorage.setItem('arc:bad', '{not json');
    expect(readJson('arc:bad', 'fb')).toBe('fb');
  });
  it('removeKey deletes', () => {
    writeJson('arc:x', 1);
    removeKey('arc:x');
    expect(readJson('arc:x', null)).toBeNull();
  });
});

describe('books.ts', () => {
  it('creates books with increasing order and renames', () => {
    const a = createBook({ id: 'b1', title: 'A', author: '', format: 'txt', toc: [], coverRef: undefined, progress: undefined });
    const b = createBook({ id: 'b2', title: 'B', author: '', format: 'epub', toc: [], coverRef: undefined, progress: undefined });
    expect(listBooks().map((x) => x.id)).toEqual(['b1', 'b2']);
    expect(b.order).toBeGreaterThan(a.order);
    renameBook('b1', 'A2');
    expect(getBook('b1')!.title).toBe('A2');
  });
  it('reorders and saves progress', () => {
    createBook({ id: 'b1', title: 'A', author: '', format: 'txt', toc: [], coverRef: undefined, progress: undefined });
    createBook({ id: 'b2', title: 'B', author: '', format: 'txt', toc: [], coverRef: undefined, progress: undefined });
    reorderBooks(['b2', 'b1']);
    expect(listBooks().map((x) => x.id)).toEqual(['b2', 'b1']);
    saveProgress('b1', '3', '3:12');
    expect(getBook('b1')!.progress).toEqual({ chapterId: '3', paragraphId: '3:12' });
  });
});

describe('personas.ts', () => {
  it('creates, updates, deletes personas', () => {
    const p = savePersona({ name: 'Holmes', avatar: '', characterDescription: 'witty detective', language: 'English' });
    expect(listPersonas()).toHaveLength(1);
    savePersona({ ...p, name: 'Sherlock' });
    expect(listPersonas()[0].name).toBe('Sherlock');
    expect(listPersonas()).toHaveLength(1);
    deletePersona(p.id);
    expect(listPersonas()).toHaveLength(0);
  });
});

describe('threads.ts', () => {
  const t: Thread = {
    id: 't1', bookId: 'b1', chapterId: '0', paragraphId: '0:3',
    selectedText: 'excerpt', comments: [{ personaId: 'p1', text: 'ha!' }], createdAt: 1,
  };
  it('appends and queries by book/chapter', () => {
    addThreads([t]);
    expect(listThreads('b1')).toHaveLength(1);
    expect(listThreads('b1', '0')).toHaveLength(1);
    expect(listThreads('b1', '1')).toHaveLength(0);
    expect(listThreads('b2')).toHaveLength(0);
  });
  it('deleteThreadsForBook removes only that book', () => {
    addThreads([t, { ...t, id: 't2', bookId: 'b2' }]);
    deleteThreadsForBook('b1');
    expect(listThreads('b1')).toHaveLength(0);
    expect(listThreads('b2')).toHaveLength(1);
  });
});

describe('bookmarks.ts + settings.ts', () => {
  it('bookmarks CRUD', () => {
    addBookmark({ bookId: 'b1', chapterId: '0', paragraphId: '0:1' });
    expect(listBookmarks('b1')).toHaveLength(1);
  });
  it('settings/prefs defaults and persistence', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    saveSettings({ baseUrl: 'https://api.example.com/v1', apiKey: 'k', model: 'm', systemPromptTemplate: 'tpl {{personas}}' });
    expect(getSettings().model).toBe('m');
    expect(getPrefs()).toEqual(DEFAULT_PREFS);
    savePrefs({ fontSize: 20, fontFamily: 'serif', lineSpacing: 2.0 });
    expect(getPrefs().fontSize).toBe(20);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail** (`Cannot find module '@/lib/storage/local'`)

```bash
npm test
```

- [ ] **Step 3: `src/lib/types.ts`**

```ts
export interface TocEntry { title: string; chapterId: string; level: number }

export interface Paragraph {
  id: string; // `${chapterIndex}:${paragraphIndex}`
  text: string;
  tag: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote';
  images?: { path: string; alt?: string }[];
}

export interface ChapterImage { path: string; blob: Blob }

export interface ParsedChapter { id: string; title: string; paragraphs: Paragraph[]; images: ChapterImage[] }

export interface ParsedBook {
  title: string;
  author: string;
  cover?: Blob;
  toc: TocEntry[];
  chapters: ParsedChapter[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: 'epub' | 'txt';
  coverRef?: string;          // idb key
  toc: TocEntry[];
  addedAt: number;
  order: number;
  progress?: { chapterId: string; paragraphId: string };
}

export interface Persona {
  id: string;
  name: string;
  avatar: string;             // base64 data URL, <=256px
  characterDescription: string;
  language: string;           // '中文' | 'English' | custom
  createdAt: number;
}

export interface ThreadComment { personaId: string; text: string }

export interface Thread {
  id: string;
  bookId: string;
  chapterId: string;
  paragraphId: string;
  selectedText: string;
  comments: ThreadComment[];
  createdAt: number;
}

export interface Bookmark { id: string; bookId: string; chapterId: string; paragraphId: string; createdAt: number }

export interface Settings {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPromptTemplate: string; // contains {{personas}}
}

export interface ReaderPrefs { fontSize: number; fontFamily: string; lineSpacing: number }

export interface NumberedParagraph { index: number; pid: string; text: string }

export interface AIComment { personaId: string; paragraphIndex: number; text: string }
```

- [ ] **Step 4: `src/lib/storage/keys.ts` + `local.ts`**

```ts
// keys.ts
export const K = {
  books: 'arc:books',
  personas: 'arc:personas',
  threads: 'arc:threads',
  bookmarks: 'arc:bookmarks',
  settings: 'arc:settings',
  prefs: 'arc:prefs',
} as const;
```

```ts
// local.ts
export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeKey(key: string): void {
  window.localStorage.removeItem(key);
}
```

- [ ] **Step 5: `src/lib/storage/idb.ts`**

```ts
import { createStore, get, set, del, delMany } from 'idb-keyval';

const store = createStore('arc-books', 'kv');

export function idbSet(key: string, value: unknown): Promise<void> {
  return set(key, value, store);
}
export function idbGet<T>(key: string): Promise<T | undefined> {
  return get<T>(key, store);
}
export function idbDel(key: string): Promise<void> {
  return del(key, store);
}
export function idbDelMany(keys: string[]): Promise<void> {
  return delMany(keys, store);
}

// Key conventions:
//   book:{bookId}:file            → original File/Blob
//   book:{bookId}:cover           → cover Blob
//   book:{bookId}:chapter:{cid}   → ParsedChapter
export const idbKeys = {
  file: (bookId: string) => `book:${bookId}:file`,
  cover: (bookId: string) => `book:${bookId}:cover`,
  chapter: (bookId: string, chapterId: string) => `book:${bookId}:chapter:${chapterId}`,
};
```

- [ ] **Step 6: `src/lib/storage/books.ts`**

```ts
import type { Book } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';
import { idbDel, idbDelMany, idbKeys } from './idb';
import { deleteThreadsForBook } from './threads';
import { deleteBookmarksForBook } from './bookmarks';

export function listBooks(): Book[] {
  return readJson<Book[]>(K.books, []).sort((a, b) => a.order - b.order);
}

function writeBooks(books: Book[]): void {
  writeJson(K.books, books);
}

export function getBook(id: string): Book | undefined {
  return listBooks().find((b) => b.id === id);
}

export function createBook(meta: Omit<Book, 'addedAt' | 'order'>): Book {
  const books = listBooks();
  const book: Book = {
    ...meta,
    addedAt: Date.now(),
    order: books.length ? Math.max(...books.map((b) => b.order)) + 1 : 0,
  };
  writeBooks([...books, book]);
  return book;
}

export function renameBook(id: string, title: string): void {
  writeBooks(listBooks().map((b) => (b.id === id ? { ...b, title } : b)));
}

export async function deleteBook(id: string): Promise<void> {
  const book = getBook(id);
  writeBooks(listBooks().filter((b) => b.id !== id));
  deleteThreadsForBook(id);
  deleteBookmarksForBook(id);
  const chapterKeys = (book?.toc ?? []).map((t) => idbKeys.chapter(id, t.chapterId));
  await idbDelMany([idbKeys.file(id), idbKeys.cover(id), ...chapterKeys]).catch(() => {});
}

export function reorderBooks(orderedIds: string[]): void {
  const books = listBooks();
  writeBooks(
    orderedIds
      .map((id, i) => {
        const b = books.find((x) => x.id === id);
        return b ? { ...b, order: i } : undefined;
      })
      .filter((b): b is Book => Boolean(b)),
  );
}

export function saveProgress(bookId: string, chapterId: string, paragraphId: string): void {
  writeBooks(listBooks().map((b) => (b.id === bookId ? { ...b, progress: { chapterId, paragraphId } } : b)));
}
```

- [ ] **Step 7: `personas.ts`, `threads.ts`, `bookmarks.ts`**

```ts
// personas.ts
import type { Persona } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listPersonas(): Persona[] {
  return readJson<Persona[]>(K.personas, []);
}

export function getPersona(id: string): Persona | undefined {
  return listPersonas().find((p) => p.id === id);
}

export function savePersona(p: Omit<Persona, 'id' | 'createdAt'> & { id?: string }): Persona {
  const personas = listPersonas();
  if (p.id) {
    const existing = personas.find((x) => x.id === p.id);
    const updated: Persona = { ...existing!, ...p, id: p.id, createdAt: existing?.createdAt ?? Date.now() };
    writeJson(K.personas, personas.map((x) => (x.id === p.id ? updated : x)));
    return updated;
  }
  const created: Persona = { ...p, id: crypto.randomUUID(), createdAt: Date.now() };
  writeJson(K.personas, [...personas, created]);
  return created;
}

export function deletePersona(id: string): void {
  writeJson(K.personas, listPersonas().filter((p) => p.id !== id));
}
```

```ts
// threads.ts
import type { Thread } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listThreads(bookId: string, chapterId?: string): Thread[] {
  return readJson<Thread[]>(K.threads, []).filter(
    (t) => t.bookId === bookId && (chapterId === undefined || t.chapterId === chapterId),
  );
}

export function addThreads(threads: Thread[]): void {
  writeJson(K.threads, [...readJson<Thread[]>(K.threads, []), ...threads]);
}

export function deleteThreadsForBook(bookId: string): void {
  writeJson(K.threads, readJson<Thread[]>(K.threads, []).filter((t) => t.bookId !== bookId));
}
```

```ts
// bookmarks.ts
import type { Bookmark } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listBookmarks(bookId: string): Bookmark[] {
  return readJson<Bookmark[]>(K.bookmarks, []).filter((b) => b.bookId === bookId);
}

export function addBookmark(b: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
  const bookmark: Bookmark = { ...b, id: crypto.randomUUID(), createdAt: Date.now() };
  writeJson(K.bookmarks, [...readJson<Bookmark[]>(K.bookmarks, []), bookmark]);
  return bookmark;
}

export function deleteBookmark(id: string): void {
  writeJson(K.bookmarks, readJson<Bookmark[]>(K.bookmarks, []).filter((b) => b.id !== id));
}

export function deleteBookmarksForBook(bookId: string): void {
  writeJson(K.bookmarks, readJson<Bookmark[]>(K.bookmarks, []).filter((b) => b.bookId !== bookId));
}
```

- [ ] **Step 8: `settings.ts`**

```ts
import type { ReaderPrefs, Settings } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE } from '@/lib/prompts';

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPromptTemplate: DEFAULT_SYSTEM_PROMPT_TEMPLATE,
};

export const DEFAULT_PREFS: ReaderPrefs = { fontSize: 18, fontFamily: 'var(--font-geist-sans)', lineSpacing: 1.8 };

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(K.settings, {}) };
}

export function saveSettings(s: Settings): void {
  writeJson(K.settings, s);
}

export function getPrefs(): ReaderPrefs {
  return { ...DEFAULT_PREFS, ...readJson<Partial<ReaderPrefs>>(K.prefs, {}) };
}

export function savePrefs(p: ReaderPrefs): void {
  writeJson(K.prefs, p);
}
```

- [ ] **Step 9: Stub `src/lib/prompts.ts`** (full template arrives in Task 9; storage needs the constant now)

```ts
export const DEFAULT_SYSTEM_PROMPT_TEMPLATE = 'You are reading together with the user as: {{personas}}';
```

- [ ] **Step 10: Run tests → all pass, then commit**

```bash
npm test
git add -A
git commit -m "feat: domain types and localStorage/IndexedDB storage layer"
```

---

### Task 3: EPUB Parser (`lib/epub.ts`)

**Files:**
- Create: `src/lib/epub.ts`
- Test: `src/lib/__tests__/epub.test.ts`

**Interfaces:**
- Consumes: `ParsedBook`, `ParsedChapter`, `Paragraph`, `TocEntry` from `@/lib/types`
- Produces: `parseEpub(data: ArrayBuffer): Promise<ParsedBook>` — throws `Error('CORRUPT_EPUB')` on unreadable structure. Paragraph IDs are `"${chapterIndex}:${paragraphIndex}"`; chapter IDs are `String(chapterIndex)`; image `path` values are zip-internal absolute paths (no leading `/`).

- [ ] **Step 1: Write failing tests** — `src/lib/__tests__/epub.test.ts`

The test builds real EPUB zips in memory with JSZip:

```ts
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseEpub } from '@/lib/epub';

async function buildEpub3(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`);
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>Test Book</dc:title><dc:creator>Jane Author</dc:creator>
      </metadata>
      <manifest>
        <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
        <item id="ch2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="cover" href="img/cover.png" media-type="image/png" properties="cover-image"/>
        <item id="pic" href="img/pic.png" media-type="image/png"/>
      </manifest>
      <spine><itemref idref="ch1"/><itemref idref="ch2"/></spine>
    </package>`);
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
    <body><nav epub:type="toc"><ol>
      <li><a href="text/ch1.xhtml">Chapter One</a>
        <ol><li><a href="text/ch1.xhtml#s2">Section 1.2</a></li></ol></li>
      <li><a href="text/ch2.xhtml">Chapter Two</a></li>
    </ol></nav></body></html>`);
  zip.file('OEBPS/text/ch1.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body>
      <h1>Chapter One</h1>
      <p>Hello world.</p>
      <p>   </p>
      <p>Second <b>para</b>.</p>
      <div><p>Nested para.</p></div>
      <script>alert(1)</script>
      <p><img src="../img/pic.png" alt="A pic"/></p>
      <blockquote>A quote.</blockquote>
    </body></html>`);
  zip.file('OEBPS/text/ch2.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body><p>Second chapter text.</p></body></html>`);
  zip.file('OEBPS/img/cover.png', new Uint8Array([137, 80, 78, 71]));
  zip.file('OEBPS/img/pic.png', new Uint8Array([137, 80, 78, 71]));
  return zip.generateAsync({ type: 'arraybuffer' });
}

async function buildEpub2(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`);
  zip.file('content.opf', `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Old Book</dc:title></metadata>
      <manifest>
        <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
      </manifest>
      <spine toc="ncx"><itemref idref="ch1"/></spine>
    </package>`);
  zip.file('toc.ncx', `<?xml version="1.0"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
      <navMap>
        <navPoint id="n1" playOrder="1"><navLabel><text>Start</text></navLabel><content src="ch1.xhtml"/>
          <navPoint id="n2" playOrder="2"><navLabel><text>Start B</text></navLabel><content src="ch1.xhtml#b"/></navPoint>
        </navPoint>
      </navMap>
    </ncx>`);
  zip.file('ch1.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body><p>Only chapter.</p></body></html>`);
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('parseEpub (EPUB3)', () => {
  it('extracts metadata, toc with levels, chapters, paragraphs, images, cover', async () => {
    const book = await parseEpub(await buildEpub3());
    expect(book.title).toBe('Test Book');
    expect(book.author).toBe('Jane Author');
    expect(book.cover).toBeInstanceOf(Blob);

    expect(book.toc).toEqual([
      { title: 'Chapter One', chapterId: '0', level: 0 },
      { title: 'Section 1.2', chapterId: '0', level: 1 },
      { title: 'Chapter Two', chapterId: '1', level: 0 },
    ]);

    expect(book.chapters).toHaveLength(2);
    const ch0 = book.chapters[0];
    expect(ch0.id).toBe('0');
    expect(ch0.title).toBe('Chapter One');

    const ids = ch0.paragraphs.map((p) => p.id);
    expect(ids).toEqual(['0:0', '0:1', '0:2', '0:3', '0:4', '0:5']);
    expect(ch0.paragraphs[0]).toMatchObject({ tag: 'h1', text: 'Chapter One' });
    expect(ch0.paragraphs[1].text).toBe('Hello world.');
    expect(ch0.paragraphs[2].text).toBe('Second para.');       // inline tags flattened
    expect(ch0.paragraphs[3].text).toBe('Nested para.');       // nested block found once
    expect(ch0.paragraphs[4].images).toEqual([{ path: 'OEBPS/img/pic.png', alt: 'A pic' }]);
    expect(ch0.paragraphs[5]).toMatchObject({ tag: 'blockquote', text: 'A quote.' });
    expect(ch0.paragraphs.some((p) => p.text.includes('alert'))).toBe(false); // script stripped
    expect(ch0.images).toHaveLength(1);
    expect(ch0.images[0].path).toBe('OEBPS/img/pic.png');
    expect(ch0.images[0].blob).toBeInstanceOf(Blob);

    expect(book.chapters[1].paragraphs[0].text).toBe('Second chapter text.');
  });

  it('throws CORRUPT_EPUB on garbage', async () => {
    await expect(parseEpub(new ArrayBuffer(8))).rejects.toThrow('CORRUPT_EPUB');
  });
});

describe('parseEpub (EPUB2 NCX)', () => {
  it('reads toc.ncx when nav.xhtml is absent', async () => {
    const book = await parseEpub(await buildEpub2());
    expect(book.title).toBe('Old Book');
    expect(book.toc).toEqual([
      { title: 'Start', chapterId: '0', level: 0 },
      { title: 'Start B', chapterId: '0', level: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run — fails** (`Cannot find module '@/lib/epub'`)

```bash
npm test
```

- [ ] **Step 3: Implement `src/lib/epub.ts`**

```ts
import JSZip from 'jszip';
import type { ChapterImage, Paragraph, ParsedBook, ParsedChapter, TocEntry } from './types';

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);
const STRIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME']);

/** Resolve `href` relative to directory `baseDir` (both zip-internal, no leading slash). */
export function resolvePath(baseDir: string, href: string): string {
  const clean = decodeURIComponent(href.split('#')[0]);
  const parts = [...(baseDir ? baseDir.split('/') : []), ...clean.split('/')];
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function dirOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xhtml+xml');
  if (doc.querySelector('parsererror')) {
    return new DOMParser().parseFromString(xml, 'text/html');
  }
  return doc;
}

/** First element (document order) whose localName matches, ignoring namespaces. */
function byLocal(root: Document | Element, name: string): Element | null {
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) if (all[i].localName === name) return all[i];
  return null;
}

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim();
}

async function blobAt(zip: JSZip, path: string): Promise<Blob | undefined> {
  const entry = zip.file(path);
  if (!entry) return undefined;
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const mime =
    ext === 'png' ? 'image/png'
    : ext === 'gif' ? 'image/gif'
    : ext === 'svg' ? 'image/svg+xml'
    : ext === 'webp' ? 'image/webp'
    : 'image/jpeg';
  return new Blob([await entry.async('arraybuffer')], { type: mime });
}

/** Collect leaf block-level paragraphs in document order; strip dangerous nodes inline.
 *  NOTE: XML-parsed documents (application/xhtml+xml) preserve authored lowercase tagNames,
 *  HTML-parsed ones uppercase them — always normalize with toUpperCase() before set lookup. */
function extractParagraphs(body: Element, chapterIndex: number, chapterDir: string): Paragraph[] {
  const out: Paragraph[] = [];
  const tagOf = (el: Element) => el.tagName.toUpperCase();
  const walk = (el: Element) => {
    const tag = tagOf(el);
    if (STRIP_TAGS.has(tag)) return;
    if (BLOCK_TAGS.has(tag)) {
      const hasBlockChild = Array.from(el.children).some((c) => BLOCK_TAGS.has(tagOf(c)));
      if (!hasBlockChild) {
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        const images = Array.from(el.getElementsByTagName('img'))
          .filter((img) => Boolean(img.getAttribute('src')))
          .map((img) => ({
            path: resolvePath(chapterDir, img.getAttribute('src')!),
            alt: img.getAttribute('alt') ?? undefined,
          }));
        if (text || images.length) {
          out.push({
            id: `${chapterIndex}:${out.length}`,
            text,
            tag: tag.toLowerCase() as Paragraph['tag'],
            ...(images.length ? { images } : {}),
          });
        }
        return;
      }
    }
    for (const child of Array.from(el.children)) walk(child);
  };
  walk(body);
  return out;
}

/** Parse a nav.xhtml or toc.ncx element tree into flat entries with nesting level. */
function tocFromNav(navEl: Element, chapterDir: string, chapterIdByPath: Map<string, string>): TocEntry[] {
  const entries: TocEntry[] = [];
  const walkList = (list: Element, level: number) => {
    for (const li of Array.from(list.children).filter((c) => c.localName === 'li')) {
      const anchor = Array.from(li.children).find((c) => c.localName === 'a' || c.localName === 'span');
      const href = anchor?.getAttribute('href');
      const title = textOf(anchor);
      if (title && href) {
        const path = resolvePath(chapterDir, href);
        const chapterId = chapterIdByPath.get(path);
        if (chapterId !== undefined) entries.push({ title, chapterId, level });
      }
      const sub = Array.from(li.children).find((c) => c.localName === 'ol' || c.localName === 'ul');
      if (sub) walkList(sub, level + 1);
    }
  };
  const root = Array.from(navEl.getElementsByTagName('ol'))[0] ?? Array.from(navEl.getElementsByTagName('ul'))[0];
  if (root) walkList(root, 0);
  return entries;
}

function tocFromNcx(ncxDoc: Document, chapterDir: string, chapterIdByPath: Map<string, string>): TocEntry[] {
  const entries: TocEntry[] = [];
  const walkPoint = (np: Element, level: number) => {
    let title = '';
    let src = '';
    for (const child of Array.from(np.children)) {
      if (child.localName === 'navLabel') title = textOf(byLocal(child, 'text') ?? child);
      if (child.localName === 'content') src = child.getAttribute('src') ?? '';
    }
    if (title && src) {
      const chapterId = chapterIdByPath.get(resolvePath(chapterDir, src));
      if (chapterId !== undefined) entries.push({ title, chapterId, level });
    }
    for (const child of Array.from(np.children)) {
      if (child.localName === 'navPoint') walkPoint(child, level + 1);
    }
  };
  const navMap = byLocal(ncxDoc, 'navMap');
  if (navMap) {
    for (const child of Array.from(navMap.children)) {
      if (child.localName === 'navPoint') walkPoint(child, 0);
    }
  }
  return entries;
}

export async function parseEpub(data: ArrayBuffer): Promise<ParsedBook> {
  try {
    const zip = await JSZip.loadAsync(data);

    // 1. container.xml → OPF path
    const containerXml = await zip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) throw new Error('no container');
    const containerDoc = parseXml(containerXml);
    const rootfile = byLocal(containerDoc, 'rootfile');
    const opfPath = rootfile?.getAttribute('full-path');
    if (!opfPath) throw new Error('no opf');
    const opfDir = dirOf(opfPath);

    // 2. OPF: metadata, manifest, spine
    const opfDoc = parseXml((await zip.file(opfPath)?.async('text')) ?? '');
    const title = textOf(byLocal(opfDoc, 'title')) || 'Untitled';
    const author = textOf(byLocal(opfDoc, 'creator'));

    const manifest = new Map<string, { href: string; mediaType: string; properties: string }>();
    for (const item of Array.from(opfDoc.getElementsByTagName('item'))) {
      manifest.set(item.getAttribute('id') ?? '', {
        href: item.getAttribute('href') ?? '',
        mediaType: item.getAttribute('media-type') ?? '',
        properties: item.getAttribute('properties') ?? '',
      });
    }
    const spineHrefs: string[] = [];
    for (const ref of Array.from(opfDoc.getElementsByTagName('itemref'))) {
      const item = manifest.get(ref.getAttribute('idref') ?? '');
      if (item) spineHrefs.push(resolvePath(opfDir, item.href));
    }
    if (!spineHrefs.length) throw new Error('empty spine');
    const chapterIdByPath = new Map(spineHrefs.map((p, i) => [p, String(i)]));

    // 3. TOC: EPUB3 nav → else EPUB2 ncx → else spine fallback
    let toc: TocEntry[] = [];
    const navItem = [...manifest.values()].find((i) => i.properties.split(/\s+/).includes('nav'));
    if (navItem) {
      const navPath = resolvePath(opfDir, navItem.href);
      const navDoc = parseXml((await zip.file(navPath)?.async('text')) ?? '');
      const navEl = Array.from(navDoc.getElementsByTagName('nav')).find(
        (n) => (n.getAttribute('epub:type') ?? n.getAttribute('role') ?? '').includes('toc') || n.getElementsByTagName('ol').length > 0,
      );
      if (navEl) toc = tocFromNav(navEl, dirOf(navPath), chapterIdByPath);
    }
    if (!toc.length) {
      const ncxItem = [...manifest.values()].find((i) => i.mediaType === 'application/x-dtbncx+xml');
      if (ncxItem) {
        const ncxPath = resolvePath(opfDir, ncxItem.href);
        toc = tocFromNcx(parseXml((await zip.file(ncxPath)?.async('text')) ?? ''), dirOf(ncxPath), chapterIdByPath);
      }
    }

    // 4. Chapters
    const chapters: ParsedChapter[] = [];
    const chapterTitles = new Map<string, string>();
    for (const entry of toc) if (!chapterTitles.has(entry.chapterId)) chapterTitles.set(entry.chapterId, entry.title);
    for (let i = 0; i < spineHrefs.length; i++) {
      const path = spineHrefs[i];
      const doc = parseXml((await zip.file(path)?.async('text')) ?? '');
      const body = doc.body ?? doc.documentElement;
      const paragraphs = body ? extractParagraphs(body, i, dirOf(path)) : [];
      const imagePaths = new Set(paragraphs.flatMap((p) => (p.images ?? []).map((im) => im.path)));
      const images: ChapterImage[] = [];
      for (const imgPath of imagePaths) {
        const blob = await blobAt(zip, imgPath);
        if (blob) images.push({ path: imgPath, blob });
      }
      chapters.push({ id: String(i), title: chapterTitles.get(String(i)) ?? `Chapter ${i + 1}`, paragraphs, images });
    }
    if (!toc.length) {
      toc = chapters.map((c) => ({ title: c.title, chapterId: c.id, level: 0 }));
    }

    // 5. Cover: cover-image property → meta name="cover" → first chapter image (spec §5.6)
    let cover: Blob | undefined;
    const coverItem = [...manifest.values()].find((i) => i.properties.split(/\s+/).includes('cover-image'));
    if (coverItem) cover = await blobAt(zip, resolvePath(opfDir, coverItem.href));
    if (!cover) {
      const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find((m) => m.getAttribute('name') === 'cover');
      const id = metaCover?.getAttribute('content');
      const item = id ? manifest.get(id) : undefined;
      if (item) cover = await blobAt(zip, resolvePath(opfDir, item.href));
    }
    if (!cover) cover = chapters[0]?.images[0]?.blob;

    return { title, author, cover, toc, chapters };
  } catch (err) {
    if (err instanceof Error && err.message === 'CORRUPT_EPUB') throw err;
    throw new Error('CORRUPT_EPUB');
  }
}
```

- [ ] **Step 4: Run tests → all 3 pass**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: in-browser EPUB parser with TOC, paragraphs, images, cover"
```

---

### Task 4: TXT Parser (`lib/txt.ts`)

**Files:**
- Create: `src/lib/txt.ts`
- Test: `src/lib/__tests__/txt.test.ts`

**Interfaces:**
- Produces: `parseTxt(data: ArrayBuffer, filename: string): Promise<ParsedBook>` — same `ParsedBook` shape as `parseEpub`. Encoding: UTF-8 strict, fallback GBK. Chapter headings: lines matching `第…[章回卷节]` or `Chapter N`/`CHAPTER N`. If no headings: paragraphs grouped into chapters of 500 (`Part 1..N`). Paragraph IDs use the same `"${chapterIndex}:${paragraphIndex}"` format.

- [ ] **Step 1: Write failing tests** — `src/lib/__tests__/txt.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parseTxt } from '@/lib/txt';

const enc = new TextEncoder();

describe('parseTxt', () => {
  it('splits Chinese chapter headings', async () => {
    const text = `序\n开篇的话。\n第一章 风起\n第一段的正文。\n\n第二段的正文。\n第二章 云涌\n第三章内容。`;
    const book = await parseTxt(enc.encode(text).buffer as ArrayBuffer, 'story.txt');
    expect(book.title).toBe('story');
    expect(book.chapters.map((c) => c.title)).toEqual(['序', '第一章 风起', '第二章 云涌']);
    expect(book.chapters[0].paragraphs[0]).toMatchObject({ id: '0:0', text: '开篇的话。' });
    expect(book.chapters[1].paragraphs.map((p) => p.id)).toEqual(['1:0', '1:1']);
    expect(book.chapters[1].paragraphs[0].text).toBe('第一段的正文。');
    expect(book.chapters[2].paragraphs[0].text).toBe('第三章内容。');
    expect(book.toc).toHaveLength(3);
  });

  it('splits English "Chapter N" headings case-insensitively', async () => {
    const text = `CHAPTER 1\nIt began.\nChapter 2\nIt continued.`;
    const book = await parseTxt(enc.encode(text).buffer as ArrayBuffer, 'en.txt');
    expect(book.chapters.map((c) => c.title)).toEqual(['CHAPTER 1', 'Chapter 2']);
  });

  it('falls back to GBK when UTF-8 decoding fails', async () => {
    // "你好" in GBK = C4 E3 BA C3, invalid as UTF-8
    const bytes = new Uint8Array([0xc4, 0xe3, 0xba, 0xc3, 0x0a, 0xc4, 0xe3, 0xba, 0xc3]);
    const book = await parseTxt(bytes.buffer as ArrayBuffer, 'gbk.txt');
    expect(book.chapters[0].paragraphs[0].text).toBe('你好');
  });

  it('chunks heading-less text into 500-paragraph parts', async () => {
    const text = Array.from({ length: 1200 }, (_, i) => `段落${i}`).join('\n');
    const book = await parseTxt(enc.encode(text).buffer as ArrayBuffer, 'long.txt');
    expect(book.chapters).toHaveLength(3);
    expect(book.chapters[0].title).toBe('Part 1');
    expect(book.chapters[2].paragraphs).toHaveLength(200);
    expect(book.chapters[1].paragraphs[0].id).toBe('1:0');
  });
});
```

- [ ] **Step 2: Run — fails, then implement `src/lib/txt.ts`**

```ts
import type { ParsedBook, ParsedChapter, Paragraph, TocEntry } from './types';

// NOTE: no \b after the Chinese branch — JS \b is ASCII-only and never fires next to CJK chars.
const CHAPTER_RE = /^\s*(第[0-9零一二三四五六七八九十百千万两]+[章回卷节].*|chapter\s+\d+\b.*)$/i;
const PARAGRAPHS_PER_PART = 500;

function decode(data: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    return new TextDecoder('gbk').decode(data);
  }
}

function makeChapter(id: string, title: string, lines: string[]): ParsedChapter {
  const paragraphs: Paragraph[] = lines.map((text, i) => ({ id: `${id}:${i}`, text, tag: 'p' as const }));
  return { id, title, paragraphs, images: [] };
}

export async function parseTxt(data: ArrayBuffer, filename: string): Promise<ParsedBook> {
  const title = filename.replace(/\.[^.]+$/, '');
  const lines = decode(data)
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const chapters: ParsedChapter[] = [];
  const hasHeadings = lines.some((l) => CHAPTER_RE.test(l));

  if (!hasHeadings) {
    if (!lines.length) lines.push('(empty file)');
    for (let i = 0; i < lines.length; i += PARAGRAPHS_PER_PART) {
      chapters.push(makeChapter(String(chapters.length), `Part ${chapters.length + 1}`, lines.slice(i, i + PARAGRAPHS_PER_PART)));
    }
  } else {
    let currentTitle = '';
    let current: string[] = [];
    const flush = () => {
      if (!currentTitle && !current.length) return;
      const id = String(chapters.length);
      if (currentTitle) {
        chapters.push(makeChapter(id, currentTitle, current));
      } else {
        // preamble before first heading: first line becomes the title
        chapters.push(makeChapter(id, current[0]?.slice(0, 20) ?? 'Opening', current.slice(1)));
      }
      current = [];
      currentTitle = '';
    };
    for (const line of lines) {
      if (CHAPTER_RE.test(line)) {
        flush();
        currentTitle = line;
      } else {
        current.push(line);
      }
    }
    flush();
  }

  const toc: TocEntry[] = chapters.map((c) => ({ title: c.title, chapterId: c.id, level: 0 }));
  return { title, author: '', toc, chapters, cover: undefined };
}
```

- [ ] **Step 3: Run tests → all 4 pass, then commit**

```bash
npm test
git add -A
git commit -m "feat: TXT parser with Chinese/English chapter detection and GBK fallback"
```

---

### Task 5: Book Import + Bookshelf UI

**Files:**
- Create: `src/lib/import-book.ts`
- Modify: `src/app/page.tsx` (replace placeholder)
- Create: `src/components/books/bookshelf.tsx`, `src/components/books/book-card.tsx`, `src/components/books/book-menu.tsx`, `src/components/books/import-button.tsx`
- Modify: `src/lib/types.ts` (add `chapterCount` to `Book`), `src/lib/storage/books.ts` (delete by chapter count), `src/lib/__tests__/storage.test.ts` (adjust)

**Interfaces:**
- Produces: `importBook(file: File): Promise<Book>` — stores file/cover/chapters in idb, creates Book meta. `Book.chapterCount: number` (added this task). Consumes: `parseEpub`, `parseTxt`, storage from Task 2.

- [ ] **Step 1: Add `chapterCount` to Book type and fix chapter cleanup in deleteBook**

In `src/lib/types.ts`, add to `Book`:
```ts
  chapterCount: number;
```

In `src/lib/storage/books.ts`, replace the `deleteBook` chapter-key computation:
```ts
export async function deleteBook(id: string): Promise<void> {
  const book = getBook(id);
  writeBooks(listBooks().filter((b) => b.id !== id));
  deleteThreadsForBook(id);
  deleteBookmarksForBook(id);
  const chapterKeys = Array.from({ length: book?.chapterCount ?? 0 }, (_, i) => idbKeys.chapter(id, String(i)));
  await idbDelMany([idbKeys.file(id), idbKeys.cover(id), ...chapterKeys]).catch(() => {});
}
```

Update the storage test `createBook` fixture calls to include `chapterCount: 1` (all 4 calls across the two `books.ts` describe blocks).

- [ ] **Step 2: Run tests — fail** (missing `chapterCount` in test fixtures → type error), fix fixtures, then green

```bash
npm test
```

- [ ] **Step 3: `src/lib/import-book.ts`**

```ts
import type { Book, ParsedBook } from './types';
import { parseEpub } from './epub';
import { parseTxt } from './txt';
import { idbDelMany, idbKeys, idbSet } from './storage/idb';
import { createBook } from './storage/books';

export async function importBook(file: File): Promise<Book> {
  const data = await file.arrayBuffer();
  const isEpub = /\.epub$/i.test(file.name);
  const parsed: ParsedBook = isEpub ? await parseEpub(data) : await parseTxt(data, file.name);

  const bookId = crypto.randomUUID();
  const writtenKeys: string[] = [];
  try {
    await idbSet(idbKeys.file(bookId), file);
    writtenKeys.push(idbKeys.file(bookId));
    if (parsed.cover) {
      await idbSet(idbKeys.cover(bookId), parsed.cover);
      writtenKeys.push(idbKeys.cover(bookId));
    }
    for (const chapter of parsed.chapters) {
      await idbSet(idbKeys.chapter(bookId, chapter.id), chapter);
      writtenKeys.push(idbKeys.chapter(bookId, chapter.id));
    }
  } catch (err) {
    // Likely QuotaExceededError — roll back partial writes (spec §5: no partial entries)
    await idbDelMany(writtenKeys).catch(() => {});
    throw new Error('STORAGE_FULL');
  }

  return createBook({
    id: bookId,
    title: parsed.title,
    author: parsed.author,
    format: isEpub ? 'epub' : 'txt',
    coverRef: parsed.cover ? idbKeys.cover(bookId) : undefined,
    toc: parsed.toc,
    chapterCount: parsed.chapters.length,
    progress: undefined,
  });
}
```

- [ ] **Step 4: `src/components/books/import-button.tsx`**

```tsx
'use client';
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { importBook } from '@/lib/import-book';

export function ImportButton({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(epub|txt)$/i.test(file.name)) {
      toast.error('Only EPUB and TXT files are supported');
      return;
    }
    setBusy(true);
    try {
      const book = await importBook(file);
      toast.success(`Imported “${book.title}”`);
      onImported();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'STORAGE_FULL') toast.error('Not enough storage space on this device');
      else if (msg === 'CORRUPT_EPUB') toast.error("Couldn't import this file — it may be corrupt or DRM-protected");
      else toast.error('Import failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.txt"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        <Plus className="mr-1.5 h-4 w-4" />
        {busy ? 'Importing…' : 'Import book'}
      </Button>
    </>
  );
}
```

- [ ] **Step 5: `src/components/books/book-card.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Book } from '@/lib/types';
import { idbGet } from '@/lib/storage/idb';
import { BookMenu } from './book-menu';

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

  const chapterNum = book.progress ? Number(book.progress.chapterId) + 1 : 0;
  const progressText = book.progress ? `Ch. ${chapterNum}/${book.chapterCount}` : 'Not started';

  return (
    <Card className="group relative transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/read?id=${book.id}`} className="block">
        <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-t-lg bg-muted">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          )}
        </div>
        <CardContent className="p-3">
          <p className="line-clamp-2 text-sm font-medium">{book.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{book.author || book.format.toUpperCase()}</p>
          <p className="mt-1 text-xs text-muted-foreground">{progressText}</p>
        </CardContent>
      </Link>
      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
        <BookMenu book={book} onChanged={onChanged} />
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: `src/components/books/book-menu.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Book } from '@/lib/types';
import { deleteBook, renameBook } from '@/lib/storage/books';

export function BookMenu({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(book.title);

  const doRename = () => {
    if (title.trim()) {
      renameBook(book.id, title.trim());
      toast.success('Renamed');
      onChanged();
    }
    setRenaming(false);
  };

  const doDelete = async () => {
    await deleteBook(book.id);
    toast.success('Deleted');
    setDeleting(false);
    onChanged();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="h-8 w-8" aria-label="Book menu">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setTitle(book.title); setRenaming(true); }}>
            <Pencil className="mr-2 h-4 w-4" />Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(true)}>
            <Trash2 className="mr-2 h-4 w-4" />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename book</DialogTitle></DialogHeader>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
          <DialogFooter><Button onClick={doRename}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete “{book.title}”?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the book, its comments, and bookmarks from this device.</p>
          <DialogFooter>
            <Button variant="destructive" onClick={() => void doDelete()}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 7: `src/components/books/bookshelf.tsx`** (dnd-kit reorder)

```tsx
'use client';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Book } from '@/lib/types';
import { reorderBooks } from '@/lib/storage/books';
import { BookCard } from './book-card';

function SortableBook({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: book.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <BookCard book={book} onChanged={onChanged} />
    </div>
  );
}

export function Bookshelf({ books, onChanged }: { books: Book[]; onChanged: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = books.map((b) => b.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    reorderBooks(next);
    onChanged();
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={books.map((b) => b.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {books.map((book) => (
            <SortableBook key={book.id} book={book} onChanged={onChanged} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 8: Replace `src/app/page.tsx`**

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Book } from '@/lib/types';
import { listBooks } from '@/lib/storage/books';
import { Bookshelf } from '@/components/books/bookshelf';
import { ImportButton } from '@/components/books/import-button';
import { BookOpen } from 'lucide-react';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const refresh = useCallback(() => setBooks(listBooks()), []);
  useEffect(refresh, [refresh]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookshelf</h1>
        <ImportButton onImported={refresh} />
      </div>
      {books.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12" />
          <p>No books yet. Import an EPUB or TXT file to start reading.</p>
        </div>
      ) : (
        <Bookshelf books={books} onChanged={refresh} />
      )}
    </div>
  );
}
```

- [ ] **Step 9: Manual verification + commit**

```bash
npm run build && npm test && npm run dev
```
Manual: import a real EPUB and a TXT → cards appear with covers → rename → delete → drag reorder → reload page → order/progress persist. Then:
```bash
git add -A
git commit -m "feat: book import pipeline and bookshelf UI"
```

---

### Task 6: Reader Core (chapter rendering + progress)

**Files:**
- Create: `src/app/read/page.tsx`
- Create: `src/components/reader/reader-view.tsx`, `src/components/reader/reader-topbar.tsx`

**Interfaces:**
- Consumes: `getBook`, `saveProgress` (Task 2), `idbGet`/`idbKeys` (Task 2), `ParsedChapter` type.
- Produces: `ReaderView({ book: Book })` renders one chapter at a time; paragraphs carry `data-pid={p.id}` attributes (Tasks 10–11 depend on this). Reader container has id `reader-content` and inline CSS vars for font size/family/line-height (Task 7 sets them from prefs).
- Exposes chapter switching via `currentChapterId` state lifted inside `ReaderView`; topbar gets chapter info through props.

- [ ] **Step 1: `src/app/read/page.tsx`**

```tsx
'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Book } from '@/lib/types';
import { getBook } from '@/lib/storage/books';
import { ReaderView } from '@/components/reader/reader-view';
import { Skeleton } from '@/components/ui/skeleton';

function ReaderPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id') ?? '';
  const [book, setBook] = useState<Book | null | undefined>(undefined);

  useEffect(() => {
    const found = getBook(id);
    setBook(found ?? null);
  }, [id]);

  if (book === undefined) return <div className="container mx-auto max-w-2xl p-8"><Skeleton className="h-96 w-full" /></div>;
  if (book === null) {
    router.replace('/');
    return null;
  }
  return <ReaderView book={book} />;
}

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-2xl p-8"><Skeleton className="h-96 w-full" /></div>}>
      <ReaderPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: `src/components/reader/reader-topbar.tsx`** (includes theme toggle — AppHeader hides itself on `/read`, spec §6)

```tsx
'use client';
import Link from 'next/link';
import { ChevronLeft, List, Bookmark, Type, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReaderTopbarProps {
  title: string;
  onToc: () => void;
  onBookmarks: () => void;
  onSettings: () => void;
}

export function ReaderTopbar({ title, onToc, onBookmarks, onSettings }: ReaderTopbarProps) {
  const { setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-2">
        <Button variant="ghost" size="icon" asChild aria-label="Back to shelf">
          <Link href="/"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <p className="mx-2 flex-1 truncate text-center text-sm font-medium">{title}</p>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Theme">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}><Sun className="mr-2 h-4 w-4" />Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}><Moon className="mr-2 h-4 w-4" />Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}><Monitor className="mr-2 h-4 w-4" />System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: `src/components/reader/reader-view.tsx`**

```tsx
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Book, ParsedChapter, Paragraph } from '@/lib/types';
import { idbGet, idbKeys } from '@/lib/storage/idb';
import { saveProgress } from '@/lib/storage/books';
import { getPrefs } from '@/lib/storage/settings';
import { ReaderTopbar } from './reader-topbar';

function ParagraphBlock({ p, imageUrls }: { p: Paragraph; imageUrls: Map<string, string> }) {
  if (p.tag.startsWith('h')) {
    const Tag = p.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Tag data-pid={p.id} className="mb-4 mt-8 font-semibold">{p.text}</Tag>;
  }
  return (
    <p data-pid={p.id} className={p.tag === 'blockquote' ? 'mb-4 border-l-2 pl-4 italic text-muted-foreground' : 'mb-4'}>
      {p.text}
      {p.images?.map((img) => {
        const url = imageUrls.get(img.path);
        return url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.path} src={url} alt={img.alt ?? ''} className="my-3 max-h-80 rounded-md object-contain" />
        ) : null;
      })}
    </p>
  );
}

export function ReaderView({ book }: { book: Book }) {
  const [chapterId, setChapterId] = useState<string>(book.progress?.chapterId ?? book.toc[0]?.chapterId ?? '0');
  const [chapter, setChapter] = useState<ParsedChapter | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Paragraph to scroll to when the next chapter finishes rendering.
  // Initialized from saved progress; Task 7's jumpTo also writes it (the Book prop never updates in-session).
  const restorePidRef = useRef<string | null>(book.progress?.paragraphId ?? null);
  const prefs = getPrefs();

  // Load chapter from IndexedDB
  useEffect(() => {
    let cancelled = false;
    setChapter(null);
    void idbGet<ParsedChapter>(idbKeys.chapter(book.id, chapterId)).then((c) => {
      if (!cancelled) setChapter(c ?? null);
    });
    return () => { cancelled = true; };
  }, [book.id, chapterId]);

  // Object URLs for chapter images
  const imageUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const img of chapter?.images ?? []) map.set(img.path, URL.createObjectURL(img.blob));
    return map;
  }, [chapter]);
  useEffect(() => () => { for (const url of imageUrls.values()) URL.revokeObjectURL(url); }, [imageUrls]);

  // Restore scroll position when a chapter finishes loading (if a restore target is set)
  useEffect(() => {
    if (!chapter) return;
    const targetPid = restorePidRef.current;
    restorePidRef.current = null;
    if (targetPid) {
      requestAnimationFrame(() => {
        document.querySelector(`[data-pid="${CSS.escape(targetPid)}"]`)?.scrollIntoView({ block: 'start' });
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [chapter]);

  // Save progress on scroll (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const blocks = document.querySelectorAll('[data-pid]');
        for (const el of Array.from(blocks)) {
          if (el.getBoundingClientRect().top >= 0) {
            saveProgress(book.id, chapterId, el.getAttribute('data-pid')!);
            break;
          }
        }
      }, 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer); };
  }, [book.id, chapterId]);

  const chapterIndex = Number(chapterId);
  const goChapter = useCallback((delta: number) => {
    const next = chapterIndex + delta;
    if (next >= 0 && next < book.chapterCount) setChapterId(String(next));
  }, [chapterIndex, book.chapterCount]);

  return (
    <div className="flex min-h-screen flex-col">
      <ReaderTopbar
        title={book.title}
        onToc={() => {}}
        onBookmarks={() => {}}
        onSettings={() => {}}
      />
      <div
        id="reader-content"
        ref={containerRef}
        className="mx-auto w-full max-w-2xl flex-1 px-5 py-6"
        style={{ fontSize: prefs.fontSize, lineHeight: prefs.lineSpacing, fontFamily: prefs.fontFamily }}
      >
        {!chapter ? (
          <div className="space-y-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : (
          <>
            <h2 className="mb-6 text-xl font-bold">{chapter.title}</h2>
            {chapter.paragraphs.map((p) => (
              <ParagraphBlock key={p.id} p={p} imageUrls={imageUrls} />
            ))}
            <div className="mt-10 flex items-center justify-between border-t pt-6">
              <Button variant="outline" disabled={chapterIndex <= 0} onClick={() => goChapter(-1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />Previous
              </Button>
              <span className="text-xs text-muted-foreground">{chapterIndex + 1} / {book.chapterCount}</span>
              <Button variant="outline" disabled={chapterIndex >= book.chapterCount - 1} onClick={() => goChapter(1)}>
                Next<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification + commit**

```bash
npm run build && npm test && npm run dev
```
Manual: open an imported book → chapter renders with headings/paragraphs → scroll down → reload → position restored → prev/next chapter works → images render (EPUB with images) → dark mode readable. Then:
```bash
git add -A
git commit -m "feat: reader core with chapter rendering, image blobs, progress restore"
```

---

### Task 7: Reader Chrome (TOC, bookmarks, typography controls)

**Files:**
- Create: `src/components/reader/toc-drawer.tsx`, `src/components/reader/bookmarks-panel.tsx`, `src/components/reader/reader-settings.tsx`
- Modify: `src/components/reader/reader-view.tsx` (wire panels + live prefs state)

**Interfaces:**
- Consumes: `Book.toc`, `listBookmarks`/`addBookmark`/`deleteBookmark` (Task 2), `getPrefs`/`savePrefs` (Task 2).
- `ReaderView` lifts `prefs` into state so changes apply live.

- [ ] **Step 1: `src/components/reader/toc-drawer.tsx`**

```tsx
'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { TocEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TocDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toc: TocEntry[];
  currentChapterId: string;
  onSelect: (chapterId: string) => void;
}

export function TocDrawer({ open, onOpenChange, toc, currentChapterId, onSelect }: TocDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader><SheetTitle>Contents</SheetTitle></SheetHeader>
        <nav className="mt-4 space-y-0.5">
          {toc.map((entry, i) => (
            <button
              key={`${entry.chapterId}-${i}`}
              onClick={() => { onSelect(entry.chapterId); onOpenChange(false); }}
              className={cn(
                'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                entry.chapterId === currentChapterId && 'bg-accent font-medium',
              )}
              style={{ paddingLeft: `${12 + entry.level * 16}px` }}
            >
              {entry.title}
            </button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: `src/components/reader/bookmarks-panel.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { Bookmark } from '@/lib/types';
import { deleteBookmark, listBookmarks } from '@/lib/storage/bookmarks';

interface BookmarksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  tocTitles: Map<string, string>;
  onJump: (chapterId: string, paragraphId: string) => void;
}

export function BookmarksPanel({ open, onOpenChange, bookId, tocTitles, onJump }: BookmarksPanelProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  useEffect(() => { if (open) setBookmarks(listBookmarks(bookId)); }, [open, bookId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader><SheetTitle>Bookmarks</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {bookmarks.length === 0 && <p className="text-sm text-muted-foreground">No bookmarks yet.</p>}
          {bookmarks.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-md border p-3">
              <button
                className="text-left text-sm hover:underline"
                onClick={() => { onJump(b.chapterId, b.paragraphId); onOpenChange(false); }}
              >
                {tocTitles.get(b.chapterId) ?? `Chapter ${Number(b.chapterId) + 1}`}
                <span className="block text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</span>
              </button>
              <Button
                variant="ghost" size="icon" aria-label="Delete bookmark"
                onClick={() => { deleteBookmark(b.id); setBookmarks(listBookmarks(bookId)); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: `src/components/reader/reader-settings.tsx`**

```tsx
'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReaderPrefs } from '@/lib/types';

const FONT_OPTIONS = [
  { value: 'var(--font-geist-sans)', label: 'Geist Sans' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Serif' },
  { value: 'var(--font-geist-mono)', label: 'Mono' },
];

interface ReaderSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: ReaderPrefs;
  onChange: (prefs: ReaderPrefs) => void;
}

export function ReaderSettings({ open, onOpenChange, prefs, onChange }: ReaderSettingsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm space-y-4">
        <DialogHeader><DialogTitle>Reading settings</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Font size — {prefs.fontSize}px</Label>
          <Slider
            min={14} max={26} step={1} value={[prefs.fontSize]}
            onValueChange={([v]) => onChange({ ...prefs, fontSize: v })}
          />
        </div>
        <div className="space-y-2">
          <Label>Line spacing — {prefs.lineSpacing.toFixed(1)}</Label>
          <Slider
            min={1.4} max={2.4} step={0.1} value={[prefs.lineSpacing]}
            onValueChange={([v]) => onChange({ ...prefs, lineSpacing: v })}
          />
        </div>
        <div className="space-y-2">
          <Label>Font family</Label>
          <Select value={prefs.fontFamily} onValueChange={(v) => onChange({ ...prefs, fontFamily: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Wire into `reader-view.tsx`**

Replace the top of `ReaderView` state block and the topbar render:

```tsx
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => getPrefs());
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const updatePrefs = (next: ReaderPrefs) => { setPrefs(next); savePrefs(next); };
```
(Remove the old `const prefs = getPrefs();` line. Add imports: `useState` already present; add `ReaderPrefs` type, `savePrefs`, `TocDrawer`, `BookmarksPanel`, `ReaderSettings`.)

Add a bookmark-current-position action and jump handler inside `ReaderView`:
```tsx
  const firstVisiblePid = (): string | null => {
    for (const el of Array.from(document.querySelectorAll('[data-pid]'))) {
      if (el.getBoundingClientRect().top >= 0) return el.getAttribute('data-pid');
    }
    return null;
  };

  const addBookmarkHere = () => {
    const pid = firstVisiblePid();
    if (!pid) return;
    addBookmark({ bookId: book.id, chapterId, paragraphId: pid });
    toast.success('Bookmark added');
  };

  const jumpTo = (targetChapterId: string, paragraphId: string) => {
    if (targetChapterId === chapterId) {
      document.querySelector(`[data-pid="${CSS.escape(paragraphId)}"]`)?.scrollIntoView({ block: 'start' });
    } else {
      restorePidRef.current = paragraphId; // restore effect consumes this after the chapter loads
      saveProgress(book.id, targetChapterId, paragraphId);
      setChapterId(targetChapterId);
    }
  };
```
(Imports: `addBookmark` from `@/lib/storage/bookmarks`, `toast` from `sonner`.)

Replace `<ReaderTopbar … />` usage:
```tsx
      <ReaderTopbar
        title={book.title}
        onToc={() => setTocOpen(true)}
        onBookmarks={() => setBookmarksOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />
```

Add panels at the end of the root div (before closing tag):
```tsx
      <TocDrawer open={tocOpen} onOpenChange={setTocOpen} toc={book.toc} currentChapterId={chapterId} onSelect={(cid) => { window.scrollTo({ top: 0 }); setChapterId(cid); }} />
      <BookmarksPanel
        open={bookmarksOpen} onOpenChange={setBookmarksOpen} bookId={book.id}
        tocTitles={new Map(book.toc.map((t) => [t.chapterId, t.title]))}
        onJump={jumpTo}
      />
      <ReaderSettings open={settingsOpen} onOpenChange={setSettingsOpen} prefs={prefs} onChange={updatePrefs} />
```

Also add a "bookmark here" affordance: change the topbar bookmark button behavior — short press opens panel; add a separate small floating action button at bottom-right:
```tsx
      <Button
        variant="secondary" size="icon"
        className="fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full shadow-lg"
        onClick={addBookmarkHere} aria-label="Bookmark here"
      >
        <BookmarkPlus className="h-5 w-5" />
      </Button>
```
(Import `BookmarkPlus` from lucide-react.)

- [ ] **Step 5: Manual verification + commit**

```bash
npm run build && npm test && npm run dev
```
Manual: TOC drawer lists auto-extracted chapters with indentation, jumps work → floating bookmark button adds bookmark → panel lists/jumps/deletes → font size/line spacing/family sliders apply live and persist after reload. Then:
```bash
git add -A
git commit -m "feat: reader chrome — TOC drawer, bookmarks, typography controls"
```

---

### Task 8: Persona Management

**Files:**
- Create: `src/app/persona/page.tsx`, `src/app/persona/new/page.tsx`, `src/app/persona/edit/page.tsx`
- Create: `src/components/persona/persona-card.tsx`, `src/components/persona/persona-form.tsx`

**Interfaces:**
- Consumes: `listPersonas`, `getPersona`, `savePersona`, `deletePersona` (Task 2).
- Produces: avatar processing convention — 256×256 JPEG base64 data URL (Task 10's picker displays it).

- [ ] **Step 1: `src/components/persona/persona-form.tsx`**

```tsx
'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Persona } from '@/lib/types';
import { savePersona } from '@/lib/storage/personas';

const LANGUAGE_OPTIONS = ['中文', 'English', '日本語'];

async function fileToAvatarBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('BAD_IMAGE'));
    el.src = dataUrl;
  });
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function PersonaForm({ persona }: { persona?: Persona }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(persona?.name ?? '');
  const [avatar, setAvatar] = useState(persona?.avatar ?? '');
  const [description, setDescription] = useState(persona?.characterDescription ?? '');
  const [language, setLanguage] = useState(persona?.language ?? '中文');
  const [customLanguage, setCustomLanguage] = useState(
    persona && !LANGUAGE_OPTIONS.includes(persona.language) ? persona.language : '',
  );
  const [busy, setBusy] = useState(false);

  const onAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setAvatar(await fileToAvatarBase64(file));
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  const onSave = () => {
    const finalLanguage = customLanguage.trim() || language;
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!description.trim()) { toast.error('Character description is required'); return; }
    setBusy(true);
    savePersona({
      id: persona?.id,
      name: name.trim(),
      avatar,
      characterDescription: description.trim(),
      language: finalLanguage,
    });
    toast.success(persona ? 'Persona updated' : 'Persona created');
    router.push('/persona');
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted"
            aria-label="Upload avatar"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-10 w-10 text-muted-foreground" />
            )}
          </button>
          <div className="text-sm text-muted-foreground">Tap to upload avatar (optional)</div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onAvatarFile(e.target.files?.[0])} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sherlock Holmes" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-desc">Character description</Label>
          <Textarea
            id="p-desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="A witty and sarcastic detective who enjoys analysing people's motives."
          />
        </div>

        <div className="space-y-2">
          <Label>Comment language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={customLanguage} onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="Or type a custom language (overrides dropdown)"
          />
        </div>

        <Button className="w-full" onClick={onSave} disabled={busy}>
          {persona ? 'Save changes' : 'Create persona'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: `src/components/persona/persona-card.tsx` + list/create/edit pages**

`persona-card.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { Pencil, Trash2, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Persona } from '@/lib/types';
import { deletePersona } from '@/lib/storage/personas';

export function PersonaCard({ persona, onChanged }: { persona: Persona; onChanged: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {persona.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={persona.avatar} alt={persona.name} className="h-full w-full object-cover" />
          ) : (
            <UserCircle2 className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{persona.name}</p>
            <Badge variant="secondary">{persona.language}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{persona.characterDescription}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" asChild aria-label="Edit">
            <Link href={`/persona/edit?id=${persona.id}`}><Pencil className="h-4 w-4" /></Link>
          </Button>
          <Button
            variant="ghost" size="icon" aria-label="Delete"
            onClick={() => { deletePersona(persona.id); toast.success('Persona deleted'); onChanged(); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

`src/app/persona/page.tsx`:
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
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Companions</h1>
        <Button asChild><Link href="/persona/new"><Plus className="mr-1.5 h-4 w-4" />New persona</Link></Button>
      </div>
      {personas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
          <Users className="h-12 w-12" />
          <p>No companions yet. Create one — a detective, a poet, a grumpy cat — anyone you'd like to read with.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {personas.map((p) => <PersonaCard key={p.id} persona={p} onChanged={refresh} />)}
        </div>
      )}
    </div>
  );
}
```

`src/app/persona/new/page.tsx`:
```tsx
'use client';
import { PersonaForm } from '@/components/persona/persona-form';

export default function NewPersonaPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">New companion</h1>
      <PersonaForm />
    </div>
  );
}
```

`src/app/persona/edit/page.tsx` (query-param route — Suspense required):
```tsx
'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Persona } from '@/lib/types';
import { getPersona } from '@/lib/storage/personas';
import { PersonaForm } from '@/components/persona/persona-form';
import { Skeleton } from '@/components/ui/skeleton';

function EditInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null | undefined>(undefined);
  useEffect(() => {
    setPersona(getPersona(params.get('id') ?? '') ?? null);
  }, [params]);
  if (persona === undefined) return <Skeleton className="mx-auto h-96 max-w-lg" />;
  if (persona === null) { router.replace('/persona'); return null; }
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">Edit companion</h1>
      <PersonaForm persona={persona} />
    </div>
  );
}

export default function EditPersonaPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-lg" />}><EditInner /></Suspense>;
}
```

- [ ] **Step 3: Manual verification + commit**

```bash
npm run build && npm test && npm run dev
```
Manual: create persona with avatar (resize works, large photo shrinks) → edit → delete → custom language → persists after reload. Then:
```bash
git add -A
git commit -m "feat: persona CRUD with avatar processing and per-persona language"
```

---

### Task 9: Settings Page + AI Client (`prompts.ts`, `ai.ts`, `word-count.ts`)

**Files:**
- Create: `src/lib/word-count.ts`, `src/lib/ai.ts`
- Modify: `src/lib/prompts.ts` (replace Task 2 stub with full template + renderer)
- Create: `src/app/settings/page.tsx`, `src/components/settings/settings-form.tsx`, `src/components/settings/system-prompt-editor.tsx`
- Test: `src/lib/__tests__/prompts.test.ts`, `src/lib/__tests__/ai.test.ts`, `src/lib/__tests__/word-count.test.ts`

**Interfaces:**
- Produces:
  - `renderSystemPrompt(template: string, personas: Persona[]): string` — replaces `{{personas}}`
  - `sendToPersonas(excerpt: NumberedParagraph[], personas: Persona[], settings: Settings): Promise<AIComment[]>`
  - `callChat(settings: Settings, messages: { role: string; content: string }[]): Promise<string>`
  - `extractJson(content: string): AIComment[]`
  - `countWords(text: string): number` (CJK chars count individually)
  - Error message strings: `'TIMEOUT'`, `'NETWORK_ERROR'`, `'API_ERROR_<status>'`, `'API_BAD_RESPONSE'`, `'NO_JSON'`, `'BAD_SHAPE'`

- [ ] **Step 1: Write failing tests**

`src/lib/__tests__/word-count.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { countWords } from '@/lib/word-count';

describe('countWords', () => {
  it('counts English words', () => {
    expect(countWords('the quick brown fox')).toBe(4);
  });
  it('counts each CJK character as one word', () => {
    expect(countWords('你好世界')).toBe(4);
  });
  it('counts mixed text', () => {
    expect(countWords('hello 你好 world')).toBe(4);
  });
});
```

`src/lib/__tests__/prompts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE, renderSystemPrompt } from '@/lib/prompts';
import type { Persona } from '@/lib/types';

const holmes: Persona = {
  id: 'p1', name: 'Sherlock Holmes', avatar: '',
  characterDescription: 'A witty and sarcastic detective.', language: 'English', createdAt: 0,
};

describe('renderSystemPrompt', () => {
  it('replaces {{personas}} with formatted persona blocks', () => {
    const out = renderSystemPrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATE, [holmes]);
    expect(out).not.toContain('{{personas}}');
    expect(out).toContain('id: "p1"');
    expect(out).toContain('Sherlock Holmes');
    expect(out).toContain('witty and sarcastic');
    expect(out).toContain('language: English');
  });
  it('default template enforces selectivity and JSON shape', () => {
    expect(DEFAULT_SYSTEM_PROMPT_TEMPLATE).toContain('{{personas}}');
    expect(DEFAULT_SYSTEM_PROMPT_TEMPLATE).toContain('paragraph_index');
    expect(DEFAULT_SYSTEM_PROMPT_TEMPLATE).toContain('selectively');
  });
});
```

`src/lib/__tests__/ai.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractJson, sendToPersonas } from '@/lib/ai';
import type { NumberedParagraph, Persona, Settings } from '@/lib/types';

const settings: Settings = { baseUrl: 'https://api.test/v1', apiKey: 'k', model: 'm', systemPromptTemplate: 'P: {{personas}}' };
const persona: Persona = { id: 'p1', name: 'Holmes', avatar: '', characterDescription: 'witty', language: 'English', createdAt: 0 };
const excerpt: NumberedParagraph[] = [{ index: 0, pid: '0:0', text: 'Hello.' }];

function apiResponse(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"comments":[{"persona_id":"p1","paragraph_index":0,"text":"ha"}]}'))
      .toEqual([{ personaId: 'p1', paragraphIndex: 0, text: 'ha' }]);
  });
  it('parses fenced JSON', () => {
    expect(extractJson('```json\n{"comments":[{"persona_id":"p1","paragraph_index":2,"text":"nice"}]}\n```'))
      .toEqual([{ personaId: 'p1', paragraphIndex: 2, text: 'nice' }]);
  });
  it('parses JSON embedded in prose', () => {
    expect(extractJson('Sure! Here you go:\n{"comments":[]}\nHope that helps.')).toEqual([]);
  });
  it('throws on garbage and bad shape', () => {
    expect(() => extractJson('no json here')).toThrow();
    expect(() => extractJson('{"result":[]}')).toThrow();
  });
  it('drops malformed comment entries', () => {
    const out = extractJson('{"comments":[{"persona_id":"p1","paragraph_index":0,"text":"ok"},{"bad":true}]}');
    expect(out).toHaveLength(1);
  });
});

describe('sendToPersonas', () => {
  it('sends system+user messages and maps the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse('{"comments":[{"persona_id":"p1","paragraph_index":0,"text":"Elementary."}]}'));
    vi.stubGlobal('fetch', fetchMock);
    const out = await sendToPersonas(excerpt, [persona], settings);
    expect(out).toEqual([{ personaId: 'p1', paragraphIndex: 0, text: 'Elementary.' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/v1/chat/completions');
    const body = JSON.parse(init.body as string);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('Holmes');
    expect(body.messages[1].content).toContain('[0] Hello.');
  });

  it('retries once on malformed JSON', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse('I cannot do that'))
      .mockResolvedValueOnce(apiResponse('{"comments":[]}'));
    vi.stubGlobal('fetch', fetchMock);
    const out = await sendToPersonas(excerpt, [persona], settings);
    expect(out).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 with backoff then succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse('rate limited', 429))
      .mockResolvedValueOnce(apiResponse('{"comments":[]}'));
    vi.stubGlobal('fetch', fetchMock);
    const promise = sendToPersonas(excerpt, [persona], settings);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws on persistent non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse('nope', 500)));
    await expect(sendToPersonas(excerpt, [persona], settings)).rejects.toThrow('API_ERROR_500');
  });
});
```

- [ ] **Step 2: Run — fails (modules missing)**

```bash
npm test
```

- [ ] **Step 3: Implement `src/lib/word-count.ts`**

```ts
const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g;

export function countWords(text: string): number {
  const cjk = (text.match(CJK_RE) ?? []).length;
  const latin = (text.replace(CJK_RE, ' ').match(/[A-Za-z0-9']+/g) ?? []).length;
  return cjk + latin;
}
```

- [ ] **Step 4: Replace `src/lib/prompts.ts` stub**

```ts
import type { Persona } from './types';

export const DEFAULT_SYSTEM_PROMPT_TEMPLATE = `You are a reading companion simulator. The user is reading a book and sharing a passage with the following AI reading companion(s):

{{personas}}

Rules:
1. Each companion reads the passage through their own personality, background, and interests.
2. Each companion comments ONLY on the moments that genuinely catch their attention — skipping most paragraphs is expected and good. A real reading companion reacts selectively, never to every paragraph.
3. Stay fully in character: reactions are conversational and personal (feelings, jokes, observations, questions), not neutral summaries of the text. Never break the fourth wall or mention being an AI.
4. Write each comment in that companion's language.
5. 0-3 comments per companion; returning zero comments for a companion is perfectly fine when nothing in the passage would interest them.
6. Respond with JSON only (no markdown fences, no extra text), exactly this shape:
{"comments":[{"persona_id":"<id>","paragraph_index":<number>,"text":"<comment>"}]}`;

export function renderSystemPrompt(template: string, personas: Persona[]): string {
  const block = personas
    .map((p) => `- id: "${p.id}" | name: ${p.name} | language: ${p.language}\n  description: ${p.characterDescription}`)
    .join('\n');
  return template.replaceAll('{{personas}}', block);
}
```

- [ ] **Step 5: Implement `src/lib/ai.ts`**

```ts
import type { AIComment, NumberedParagraph, Persona, Settings } from './types';
import { renderSystemPrompt } from './prompts';

const TIMEOUT_MS = 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ChatMessage { role: string; content: string }

export async function callChat(settings: Settings, messages: ChatMessage[]): Promise<string> {
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  let lastError: Error = new Error('NETWORK_ERROR');
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: settings.model, messages, temperature: 0.8 }),
        signal: controller.signal,
      });
      if (res.status === 429 && attempt < 2) {
        await sleep(attempt === 0 ? 1000 : 3000);
        continue;
      }
      if (!res.ok) throw new Error(`API_ERROR_${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('API_BAD_RESPONSE');
      return content;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('NETWORK_ERROR');
      if (e.name === 'AbortError') throw new Error('TIMEOUT');
      if (e.message.startsWith('API_ERROR_') || e.message === 'API_BAD_RESPONSE') throw e;
      lastError = e; // network failure — loop retries
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export function extractJson(content: string): AIComment[] {
  const cleaned = content.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('NO_JSON');
  let parsed: { comments?: unknown };
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error('NO_JSON');
  }
  if (!Array.isArray(parsed.comments)) throw new Error('BAD_SHAPE');
  return (parsed.comments as unknown[]).flatMap((c) => {
    if (typeof c !== 'object' || c === null) return [];
    const r = c as Record<string, unknown>;
    if (typeof r.persona_id === 'string' && typeof r.paragraph_index === 'number' && typeof r.text === 'string') {
      return [{ personaId: r.persona_id, paragraphIndex: r.paragraph_index, text: r.text }];
    }
    return [];
  });
}

export async function sendToPersonas(
  excerpt: NumberedParagraph[],
  personas: Persona[],
  settings: Settings,
): Promise<AIComment[]> {
  const system = renderSystemPrompt(settings.systemPromptTemplate, personas);
  const passage = excerpt.map((p) => `[${p.index}] ${p.text}`).join('\n\n');
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: `Passage (paragraphs are numbered):\n\n${passage}` },
  ];
  const first = await callChat(settings, messages);
  try {
    return extractJson(first);
  } catch {
    const retry = await callChat(settings, [
      ...messages,
      { role: 'assistant', content: first },
      { role: 'user', content: 'Return valid JSON only, no other text.' },
    ]);
    return extractJson(retry);
  }
}
```

- [ ] **Step 6: Settings UI**

`src/components/settings/settings-form.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Settings } from '@/lib/types';
import { getSettings, saveSettings } from '@/lib/storage/settings';
import { callChat } from '@/lib/ai';

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [testing, setTesting] = useState(false);

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await callChat(settings, [{ role: 'user', content: 'Reply with the word: ok' }]);
      toast.success('Connection works');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'NETWORK_ERROR';
      toast.error(msg === 'TIMEOUT' ? 'Timed out — check the base URL' : `Connection failed (${msg})`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>Any OpenAI-compatible API. Your key is stored only on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="s-base">Base URL</Label>
          <Input id="s-base" value={settings.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-key">API Key</Label>
          <Input id="s-key" type="password" value={settings.apiKey} onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="sk-…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-model">Model</Label>
          <Input id="s-model" value={settings.model} onChange={(e) => update({ model: e.target.value })}
            placeholder="gpt-4o-mini" />
        </div>
        <Button variant="outline" onClick={() => void testConnection()} disabled={testing || !settings.apiKey}>
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

`src/components/settings/system-prompt-editor.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSettings, saveSettings } from '@/lib/storage/settings';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE } from '@/lib/prompts';

export function SystemPromptEditor() {
  const [template, setTemplate] = useState(() => getSettings().systemPromptTemplate);

  const save = () => {
    if (!template.includes('{{personas}}')) {
      toast.error('Template must contain {{personas}} — that is where companion profiles are inserted');
      return;
    }
    saveSettings({ ...getSettings(), systemPromptTemplate: template });
    toast.success('System prompt saved');
  };

  const reset = () => {
    setTemplate(DEFAULT_SYSTEM_PROMPT_TEMPLATE);
    saveSettings({ ...getSettings(), systemPromptTemplate: DEFAULT_SYSTEM_PROMPT_TEMPLATE });
    toast.success('Reset to default');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Prompt</CardTitle>
        <CardDescription>
          Controls how companions behave. Must contain <code>{'{{personas}}'}</code> where companion profiles are inserted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label htmlFor="prompt-editor" className="sr-only">System prompt template</Label>
        <Textarea id="prompt-editor" rows={14} className="font-mono text-xs" value={template}
          onChange={(e) => setTemplate(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={save}>Save</Button>
          <Button variant="outline" onClick={reset}>Reset to default</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

`src/app/settings/page.tsx`:
```tsx
'use client';
import { SettingsForm } from '@/components/settings/settings-form';
import { SystemPromptEditor } from '@/components/settings/system-prompt-editor';

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm />
      <SystemPromptEditor />
    </div>
  );
}
```

- [ ] **Step 7: Run tests → green; manual settings check; commit**

```bash
npm test
npm run build && npm run dev
```
Manual: enter real credentials → "Test connection" succeeds → edit template (rejects without `{{personas}}`) → reset works → values persist after reload. Then:
```bash
git add -A
git commit -m "feat: AI client with retry/backoff, prompt template system, settings page"
```

---

### Task 10: Text Selection → Send to Personas

**Files:**
- Create: `src/lib/selection.ts`
- Create: `src/components/reader/selection-toolbar.tsx`, `src/components/reader/persona-picker.tsx`
- Modify: `src/components/reader/reader-view.tsx` (selection state, send flow, pending indicator, threads state)
- Test: `src/lib/__tests__/selection.test.ts`

**Interfaces:**
- Produces: `resolveSelection(range: Range, container: HTMLElement): ResolvedSelection | null` where `ResolvedSelection = { pids: string[]; excerpt: NumberedParagraph[]; text: string }`. Reader maintains `pendingPids: string[]` and `threadsVersion: number` states consumed by Task 11.
- Consumes: `sendToPersonas`, `countWords`, storage, `Persona` (Tasks 2, 9).

- [ ] **Step 1: Write failing test** — `src/lib/__tests__/selection.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveSelection } from '@/lib/selection';

function setup(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <p data-pid="0:0">First paragraph.</p>
    <p data-pid="0:1">Second paragraph here.</p>
    <p data-pid="0:2">Third one.</p>`;
  document.body.appendChild(container);
  return container;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('resolveSelection', () => {
  it('resolves a range spanning two paragraphs to their pids and numbered excerpt', () => {
    const container = setup();
    const range = document.createRange();
    const p0 = container.querySelector('[data-pid="0:0"]')!.firstChild!;
    const p1 = container.querySelector('[data-pid="0:1"]')!.firstChild!;
    range.setStart(p0, 6);            // middle of first paragraph
    range.setEnd(p1, 6);              // into second paragraph
    const result = resolveSelection(range, container)!;
    expect(result.pids).toEqual(['0:0', '0:1']);
    expect(result.excerpt).toEqual([
      { index: 0, pid: '0:0', text: 'First paragraph.' },
      { index: 1, pid: '0:1', text: 'Second paragraph here.' },
    ]);
  });

  it('returns null for collapsed range or outside selection', () => {
    const container = setup();
    const collapsed = document.createRange();
    collapsed.setStart(container.querySelector('[data-pid="0:0"]')!.firstChild!, 2);
    collapsed.collapse(true);
    expect(resolveSelection(collapsed, container)).toBeNull();
    const outside = document.createRange();
    outside.selectNodeContents(document.body);
    const detached = document.createElement('div');
    expect(resolveSelection(outside, detached)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — fails, then implement `src/lib/selection.ts`**

```ts
import type { NumberedParagraph } from './types';

export interface ResolvedSelection {
  pids: string[];
  excerpt: NumberedParagraph[];
  text: string;
}

export function resolveSelection(range: Range, container: HTMLElement): ResolvedSelection | null {
  if (range.collapsed) return null;
  const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-pid]'));
  const selected = blocks.filter((el) => {
    try {
      return range.intersectsNode(el);
    } catch {
      return false;
    }
  });
  if (!selected.length) return null;
  const excerpt: NumberedParagraph[] = selected.map((el, index) => ({
    index,
    pid: el.getAttribute('data-pid')!,
    text: (el.textContent ?? '').trim(),
  }));
  return { pids: excerpt.map((p) => p.pid), excerpt, text: range.toString().trim() };
}
```

- [ ] **Step 3: Run tests → green**

- [ ] **Step 4: `src/components/reader/persona-picker.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { UserCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Persona } from '@/lib/types';

const MAX_PERSONAS = 5;

interface PersonaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personas: Persona[];
  onConfirm: (personaIds: string[]) => void;
}

export function PersonaPicker({ open, onOpenChange, personas, onConfirm }: PersonaPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_PERSONAS ? [...prev, id] : prev,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send to companions (max {MAX_PERSONAS})</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {personas.length === 0 && (
            <p className="text-sm text-muted-foreground">No companions yet — create one from the Personas page.</p>
          )}
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selected.includes(p.id) ? 'border-primary bg-accent' : 'hover:bg-accent',
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted">
                {p.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{p.characterDescription}</span>
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            disabled={selected.length === 0}
            onClick={() => { onConfirm(selected); setSelected([]); }}
          >
            Send ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: `src/components/reader/selection-toolbar.tsx`**

```tsx
'use client';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionToolbarProps {
  position: { x: number; y: number } | null;
  onSend: () => void;
}

export function SelectionToolbar({ position, onSend }: SelectionToolbarProps) {
  if (!position) return null;
  return (
    <div
      className="fixed z-50 -translate-x-1/2 animate-scale-in"
      style={{ left: position.x, top: position.y }}
    >
      <Button size="sm" className="shadow-lg" onMouseDown={(e) => e.preventDefault()} onClick={onSend}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Send to AI
      </Button>
    </div>
  );
}
```
Note: `onMouseDown preventDefault` keeps the text selection alive when the button is tapped.

- [ ] **Step 6: Wire selection + send flow into `reader-view.tsx`**

Add imports:
```tsx
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Persona, Thread } from '@/lib/types';
import { listPersonas } from '@/lib/storage/personas';
import { getSettings } from '@/lib/storage/settings';
import { addThreads, listThreads } from '@/lib/storage/threads';
import { sendToPersonas } from '@/lib/ai';
import { countWords } from '@/lib/word-count';
import { resolveSelection, type ResolvedSelection } from '@/lib/selection';
import { SelectionToolbar } from './selection-toolbar';
import { PersonaPicker } from './persona-picker';
```

Add state inside `ReaderView`:
```tsx
  const router = useRouter();
  const [selection, setSelection] = useState<ResolvedSelection | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingPids, setPendingPids] = useState<string[]>([]);
  const [threadsVersion, setThreadsVersion] = useState(0);
  const personas: Persona[] = useMemo(() => listPersonas(), []);
```
Add selection tracking effect (after the progress effect). The `overLimitNotifiedRef` fires the >2000-word toast once per selection instead of on every `selectionchange` (spec §10):

```tsx
  const overLimitNotifiedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setToolbarPos(null);
        overLimitNotifiedRef.current = false;
        return;
      }
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setToolbarPos(null);
        return;
      }
      const resolved = resolveSelection(range, container);
      if (!resolved) { setToolbarPos(null); return; }
      if (countWords(resolved.text) > 2000) {
        setToolbarPos(null);
        setSelection(null);
        if (!overLimitNotifiedRef.current) {
          overLimitNotifiedRef.current = true;
          toast.error('Select a shorter passage (max 2000 words)');
        }
        return;
      }
      setSelection(resolved);
      const rect = range.getBoundingClientRect();
      setToolbarPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    };

    let touchTimer: ReturnType<typeof setTimeout>;
    const onSelectionChange = () => update();
    const onTouchEnd = () => { clearTimeout(touchTimer); touchTimer = setTimeout(update, 350); };

    document.addEventListener('selectionchange', onSelectionChange);
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      container.removeEventListener('touchend', onTouchEnd);
      clearTimeout(touchTimer);
    };
  }, [chapter]);
```
Add the send handler. On failure the selection is kept and the error toast carries a **Retry** action (spec §10); on success everything clears:

```tsx
  const handleSend = async (personaIds: string[]) => {
    if (!selection) return;
    setPickerOpen(false);
    setToolbarPos(null);

    const settings = getSettings();
    if (!settings.apiKey) {
      toast.error('Set up your AI provider first');
      router.push('/settings');
      return;
    }
    const chosen = personas.filter((p) => personaIds.includes(p.id));
    const sentSelection = selection; // captured so Retry works even if state later clears
    const anchorPid = sentSelection.pids[sentSelection.pids.length - 1];
    setSending(true);
    setPendingPids([anchorPid]);
    window.getSelection()?.removeAllRanges();

    try {
      const comments = await sendToPersonas(sentSelection.excerpt, chosen, settings);
      const byPid = new Map<string, { personaId: string; text: string }[]>();
      for (const c of comments) {
        const para = sentSelection.excerpt[c.paragraphIndex];
        if (!para) continue; // model returned out-of-range index — drop safely
        const arr = byPid.get(para.pid) ?? [];
        arr.push({ personaId: c.personaId, text: c.text });
        byPid.set(para.pid, arr);
      }
      const threads: Thread[] = Array.from(byPid.entries()).map(([pid, threadComments]) => ({
        id: crypto.randomUUID(),
        bookId: book.id,
        chapterId,
        paragraphId: pid,
        selectedText: sentSelection.text,
        comments: threadComments,
        createdAt: Date.now(),
      }));
      if (threads.length) {
        addThreads(threads);
        setThreadsVersion((v) => v + 1);
        toast.success(`${chosen.length === 1 ? chosen[0].name : 'Companions'} commented`);
      } else {
        toast.info('Nothing caught their attention this time');
      }
      setSelection(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const friendly =
        msg === 'TIMEOUT' ? 'Request timed out'
        : msg.startsWith('API_ERROR_429') ? 'Rate limited — wait a moment'
        : msg.startsWith('API_ERROR_') ? `Provider error (${msg.replace('API_ERROR_', '')})`
        : msg === 'NO_JSON' || msg === 'BAD_SHAPE' ? 'Your companion got distracted'
        : 'Network error — check your connection';
      toast.error(friendly, {
        action: { label: 'Retry', onClick: () => void handleSend(personaIds) },
      });
      // NOTE: selection state is intentionally NOT cleared here so Retry re-sends the same passage
    } finally {
      setSending(false);
      setPendingPids([]);
    }
  };
```

Compute chapter threads (Task 11 renders them):
```tsx
  const chapterThreads = useMemo(
    () => listThreads(book.id, chapterId),
    // threadsVersion re-runs this memo after each send
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.id, chapterId, threadsVersion],
  );
```

Render toolbar + picker at the end of the root div:
```tsx
      <SelectionToolbar position={toolbarPos && !sending ? toolbarPos : null} onSend={() => setPickerOpen(true)} />
      <PersonaPicker open={pickerOpen} onOpenChange={setPickerOpen} personas={personas} onConfirm={(ids) => void handleSend(ids)} />
```

Guard: disable the send button flow when no personas exist — `PersonaPicker` already shows an empty-state message.

- [ ] **Step 7: Manual verification + commit**

```bash
npm test && npm run build && npm run dev
```
Manual: select text (desktop drag + mobile long-press drag) → toolbar appears → over-2000-word selection doesn't show toolbar → pick 1 and 5 personas → with a real API key, "reading…" pending state appears on the last selected paragraph → success/info/error toasts behave. Then:
```bash
git add -A
git commit -m "feat: text selection toolbar and send-to-personas flow"
```

---

### Task 11: Comment Bubbles + Popover (段评 display)

**Files:**
- Create: `src/components/reader/comment-bubble.tsx`, `src/components/reader/comment-popover.tsx`
- Modify: `src/components/reader/reader-view.tsx` (render annotations per paragraph)

**Interfaces:**
- Consumes: `chapterThreads` + `pendingPids` from Task 10, `Persona[]`, `Thread` type.
- `CommentPopover({ threads, pending, personas })` renders nothing when no threads and not pending; `CommentBubble({ count, pending, onClick })` is the visual badge.

- [ ] **Step 1: `src/components/reader/comment-bubble.tsx`**

```tsx
'use client';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentBubbleProps {
  count: number;
  pending?: boolean;
  onClick?: () => void;
}

export function CommentBubble({ count, pending, onClick }: CommentBubbleProps) {
  if (pending) {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted px-2 text-xs text-muted-foreground animate-pulse">
        <MessageCircle className="h-3 w-3" />
        companion is reading…
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border bg-accent px-2 text-xs font-medium',
        'transition-all duration-200 hover:shadow-sm',
      )}
      aria-label={`${count} comments`}
    >
      <MessageCircle className="h-3 w-3" />
      {count}
    </button>
  );
}
```

- [ ] **Step 2: `src/components/reader/comment-popover.tsx`**

```tsx
'use client';
import { UserCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { Persona, Thread } from '@/lib/types';
import { CommentBubble } from './comment-bubble';

interface CommentPopoverProps {
  threads: Thread[];
  pending: boolean;
  personas: Persona[];
}

export function CommentPopover({ threads, pending, personas }: CommentPopoverProps) {
  if (pending && threads.length === 0) {
    return (
      <div className="-mt-3 mb-4 flex justify-end">
        <CommentBubble count={0} pending />
      </div>
    );
  }
  if (threads.length === 0) return null;

  const total = threads.reduce((n, t) => n + t.comments.length, 0);
  const sorted = [...threads].sort((a, b) => b.createdAt - a.createdAt);
  const personaById = new Map(personas.map((p) => [p.id, p]));

  return (
    <div className="-mt-3 mb-4 flex justify-end">
      <Popover>
        <PopoverTrigger asChild>
          <span><CommentBubble count={total} /></span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 max-w-[85vw] space-y-3 p-4">
          {sorted.map((thread, ti) => (
            <div key={thread.id} className="space-y-3">
              {ti > 0 && <Separator />}
              {thread.comments.map((comment, ci) => {
                const persona = personaById.get(comment.personaId);
                return (
                  <div key={`${thread.id}-${ci}`} className="flex gap-2.5 animate-fade-in">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {persona?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={persona.avatar} alt={persona.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{persona?.name ?? 'Former companion'}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 3: Render annotations in `reader-view.tsx`**

Replace the paragraph render loop:
```tsx
            {chapter.paragraphs.map((p) => (
              <div key={p.id}>
                <ParagraphBlock p={p} imageUrls={imageUrls} />
                <CommentPopover
                  threads={chapterThreads.filter((t) => t.paragraphId === p.id)}
                  pending={pendingPids.includes(p.id)}
                  personas={personas}
                />
              </div>
            ))}
```
Add import: `import { CommentPopover } from './comment-popover';`

- [ ] **Step 4: Manual verification + commit**

```bash
npm test && npm run build && npm run dev
```
Manual: select passage → send → "reading…" pending bubble at end of last selected paragraph → bubble with count appears at the commented paragraph(s) → tap → popover shows persona avatar/name/comment, multiple personas stacked → multiple sends on same paragraph merge into one count → reload page → comments persist → dark mode readable. Then:
```bash
git add -A
git commit -m "feat: paragraph comment bubbles with persona popover"
```

---

### Task 12: PWA Finishing + Error Audit + End-to-End Pass

**Files:**
- Verify: `public/icons/`, `src/app/manifest.ts`, `src/components/pwa-register.tsx` (Tasks 1–2)
- Modify (only if audit finds gaps): any of the above

- [ ] **Step 1: Production build + service worker check**

```bash
npm run build
```
Expected: `out/` contains `index.html`, `read/index.html`… and `sw.js` + `manifest.webmanifest` (next-pwa emits SW into `public/` which is copied to `out/`).

- [ ] **Step 2: Serve the static export and test on a real phone**

```bash
npx serve out -l 3000
```
On a phone connected to the same LAN, open `http://<pc-ip>:3000`: install prompt / "Add to Home Screen" works, app opens standalone, bookshelf loads offline after first visit.

- [ ] **Step 3: Error audit — verify each spec §10 case**

| Case | Where handled | Verify |
|---|---|---|
| Corrupt/DRM EPUB | `import-book.ts` + `import-button.tsx` toast | import a renamed `.zip` → friendly toast, no shelf entry |
| Storage quota | `import-book.ts` → `STORAGE_FULL` toast | (code review; hard to force) |
| 429 | `ai.ts` backoff ×2 | (unit-tested, Task 9) |
| Network/timeout (60s) | `ai.ts` + `handleSend` toast with Retry action | toggle wifi off, send → toast with Retry |
| Malformed JSON | `ai.ts` 1 retry → toast | (unit-tested, Task 9) |
| Missing API settings | `reader-view.tsx` redirect | send with empty key → lands on /settings |
| >2000 word selection | `reader-view.tsx` guard + one-shot toast | toolbar hidden, toast shown once |
| Empty AI response (0 comments) | `handleSend` info toast | verify toast "Nothing caught their attention" |

- [ ] **Step 4: Full spec §11 E2E checklist (manual)**

- Import EPUB3 (nav TOC + images), EPUB2 (NCX), TXT (Chinese chapters, GBK file if available)
- TOC drawer matches book structure; chapter jump works
- Font size / line spacing / font family persist across reload
- Create 2 personas with different languages; select passage; send to both in one request
- Comments anchor at the correct paragraphs; popover shows both personas; persists across reload
- Bookmarks add/jump/delete; progress restores on reopen
- Rename, delete (book + its comments gone), drag-reorder bookshelf
- Mobile layout at 375px width; dark mode
- PWA installs and reopens offline

- [ ] **Step 5: Deploy to Vercel (optional but recommended for demo)**

```bash
npx vercel --yes
```
Vercel auto-detects Next.js; static export is served as-is. Note the URL for phone testing / future TWA wrapping.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: PWA verification, error audit, deploy prep"
```

---

## Notes for Executors

- **Windows/PowerShell environment:** commands shown use bash syntax; adapt path separators as needed (all are cross-platform npm/npx commands).
- **Sample files for manual testing:** create/obtain during Task 5 — one EPUB3 with images, one EPUB2, one Chinese TXT. Store them outside the repo (e.g., `C:\Users\natjs\AppData\Local\Temp\`) — do not commit books.
- **Model costs during manual AI testing:** use the cheapest model the provider offers (e.g., `gpt-4o-mini`).
- If a shadcn add command fails interactively, re-run with `-y -o` flags.







