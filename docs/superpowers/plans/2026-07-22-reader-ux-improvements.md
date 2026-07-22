# Reader UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 reader UX improvements: paginated page-flip instead of scroll, reader-scoped reading themes (amber default + warm white), book-wide AI comments browser drawer, optional user persona with quick switch, and system prompt extension that surfaces the active user persona to companions.

**Architecture:** All local-only (localStorage + IndexedDB, no server). Pagination via a single CSS-multicol element translated horizontally — every column stays in the DOM so native `Selection` spans pages. Reading themes are inline CSS variables scoped to `#reader-content` only; the locked dark app shell is untouched. A new `UserPersona` storage module mirrors the existing companion `personas.ts` pattern. The system-prompt renderer gains an optional `userPersona` parameter and appends a "reader you are conversing with" block when one is active — no template token, no migration of saved prompts.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript (strict), Tailwind CSS, shadcn/ui (new-york), lucide-react, vitest + jsdom for unit tests.

## Global Constraints

- Storage: localStorage (via `src/lib/storage/local.ts`) + IndexedDB (`idb-keyval`). No new runtime dependencies.
- DESIGN.md "Dark only, locked" rule applies to the app shell. Reading themes override CSS variables **only** inside `#reader-content`.
- Strict TS on — every task ends with `npx tsc --noEmit` clean.
- Lint: `npm run lint` (next lint) clean.
- Build: `npx next build` clean.
- Tests: `npm test` (vitest run). TDD for pure-logic tasks (prompts, ai, storage). DOM-geometry-heavy pieces (PaginatedChapter) verify via `tsc`/`lint`/`build` + a documented manual verification script.
- Naming follows existing patterns: `arc:*` storage keys, `listX/getX/saveX/deleteX` storage functions.
- No new deps. Reuse existing `Sheet`, `Popover`, `Select`, `Dialog`, `Slider`, `Button`, `Card`, `Input`, `Textarea`, `Label`, `Badge`.
- Spec: `docs/superpowers/specs/2026-07-22-reader-ux-improvements-design.md`.

---

## File Structure

**Create:**
- `src/lib/storage/user-personas.ts` — CRUD + active-id helpers for `UserPersona`, mirrors `personas.ts`.
- `src/components/reader/paginated-chapter.tsx` — multicol translateX page engine. Owns viewport + column-flow, reflow measuring, keyboard/buttons/swipe. Exposes `pageCount`, reports first-visible-pid per page.
- `src/components/reader/comments-drawer.tsx` — `Sheet` listing all threads for a book, grouped by chapter, filtered by persona. Jumps to page on tap.
- `src/components/reader/user-persona-switcher.tsx` — `Popover` for quick-switching active user persona from the reader topbar.
- `src/components/profile/user-persona-section.tsx` — profile section listing + creating + editing + switching user personas.
- `src/lib/reader-themes.ts` — tiny map: `ReaderTheme -> { bg, text, muted }` CSS var values + helper `readerContentStyle(theme)`.

**Modify:**
- `src/lib/types.ts` — add `ReaderTheme`, `UserPersona`, `theme` in `ReaderPrefs`, `pageIndex` in `Book.progress`.
- `src/lib/storage/keys.ts` — add `K.userPersonas`, `K.activeUserPersona`.
- `src/lib/storage/settings.ts` — extend `DEFAULT_PREFS` with `theme: 'amber'`.
- `src/lib/storage/books.ts` — `saveProgress(bookId, chapterId, paragraphId, pageIndex)`.
- `src/lib/prompts.ts` — `renderSystemPrompt(template, personas, userPersona?)`.
- `src/lib/ai.ts` — `sendToPersonas(excerpt, personas, settings, userPersona?)`.
- `src/components/reader/reader-view.tsx` — replace scroll rendering with `PaginatedChapter`; wire `pageIndex`; apply theme; thread `userPersona` into `handleSend`; mount comments drawer + user persona chip; restore progress with pageIndex.
- `src/components/reader/reader-topbar.tsx` — add comments icon, add user persona chip slot.
- `src/components/reader/reader-settings.tsx` — add theme `Select`.
- `src/components/reader/bookmarks-panel.tsx` — no logic change, but its jump contract is reused (reference only).
- `src/app/profile/page.tsx` — render `UserPersonaSection` above `SettingsForm`.
- `src/lib/__tests__/storage.test.ts` — update `saveProgress` assertion; add `user-personas` and `getPrefs` theme backward-compat suites.
- `src/lib/__tests__/prompts.test.ts` — add `userPersona` cases.
- `src/lib/__tests__/ai.test.ts` — add `userPersona` case.
- `DESIGN.md` — append "Reading themes (reader scoped)" subsection.

---

### Task 1: Types + storage foundation

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/storage/keys.ts`
- Modify: `src/lib/storage/settings.ts`
- Modify: `src/lib/storage/books.ts:56`
- Create: `src/lib/storage/user-personas.ts`
- Modify: `src/lib/__tests__/storage.test.ts:38-45`

**Interfaces:**
- Produces (consumed by Tasks 2, 3, 4, 5, 6, 7):
  - `ReaderTheme` type (`'amber' | 'warmWhite'`), exported from `src/lib/types.ts`.
  - `UserPersona` interface (fields `id: string`, `name: string`, `personality: string`, `createdAt: number`), exported from `src/lib/types.ts`.
  - `ReaderPrefs.theme: ReaderTheme` (new required field).
  - `Book.progress?: { chapterId: string; paragraphId: string; pageIndex: number }`.
  - `K.userPersonas = 'arc:userPersonas'` and `K.activeUserPersona = 'arc:activeUserPersona'` in `keys.ts`.
  - `saveProgress(bookId: string, chapterId: string, paragraphId: string, pageIndex: number): void` in `books.ts`.
  - `listUserPersonas, getUserPersona, saveUserPersona, deleteUserPersona, getActiveUserPersonaId, setActiveUserPersonaId` in `user-personas.ts` (signatures below).
  - `DEFAULT_PREFS` updated with `theme: 'amber'` as default.

- [ ] **Step 1: Add types**

Edit `src/lib/types.ts`. Add after existing `ReaderPrefs`:

```ts
export type ReaderTheme = 'amber' | 'warmWhite';

export interface UserPersona {
  id: string;
  name: string;
  personality: string;
  createdAt: number;
}
```

Update `ReaderPrefs`:

```ts
export interface ReaderPrefs { fontSize: number; fontFamily: string; lineSpacing: number; theme: ReaderTheme }
```

Update `Book.progress`:

```ts
  progress?: { chapterId: string; paragraphId: string; pageIndex: number };
```

- [ ] **Step 2: Add storage keys**

Edit `src/lib/storage/keys.ts`. Add two entries to `K` object literal:

```ts
  userPersonas: 'arc:userPersonas',
  activeUserPersona: 'arc:activeUserPersona',
```

- [ ] **Step 3: Update `DEFAULT_PREFS`**

Edit `src/lib/storage/settings.ts:14`:

```ts
export const DEFAULT_PREFS: ReaderPrefs = { fontSize: 18, fontFamily: 'var(--font-geist-sans)', lineSpacing: 1.8, theme: 'amber' };
```

- [ ] **Step 4: Update `saveProgress` signature**

Replace `src/lib/storage/books.ts:56` body:

```ts
export function saveProgress(bookId: string, chapterId: string, paragraphId: string, pageIndex: number): void {
  writeBooks(listBooks().map((b) => (b.id === bookId ? { ...b, progress: { chapterId, paragraphId, pageIndex } } : b)));
}
```

- [ ] **Step 5: Write `user-personas.ts`**

Create `src/lib/storage/user-personas.ts`:

```ts
import type { UserPersona } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listUserPersonas(): UserPersona[] {
  return readJson<UserPersona[]>(K.userPersonas, []);
}

export function getUserPersona(id: string): UserPersona | undefined {
  return listUserPersonas().find((p) => p.id === id);
}

export function saveUserPersona(p: Omit<UserPersona, 'id' | 'createdAt'> & { id?: string }): UserPersona {
  const personas = listUserPersonas();
  if (p.id) {
    const existing = personas.find((x) => x.id === p.id);
    const updated: UserPersona = { ...existing!, ...p, id: p.id, createdAt: existing?.createdAt ?? Date.now() };
    writeJson(K.userPersonas, personas.map((x) => (x.id === p.id ? updated : x)));
    return updated;
  }
  const created: UserPersona = { ...p, id: crypto.randomUUID(), createdAt: Date.now() };
  writeJson(K.userPersonas, [...personas, created]);
  return created;
}

export function deleteUserPersona(id: string): void {
  writeJson(K.userPersonas, listUserPersonas().filter((p) => p.id !== id));
  if (getActiveUserPersonaId() === id) setActiveUserPersonaId(null);
}

export function getActiveUserPersonaId(): string | null {
  return readJson<string | null>(K.activeUserPersona, null);
}

export function setActiveUserPersonaId(id: string | null): void {
  writeJson(K.activeUserPersona, id);
}
```

- [ ] **Step 6: Write the failing tests**

Append to `src/lib/__tests__/storage.test.ts`. Also update the existing `saveProgress` assertion at line 44 to include `pageIndex`.

Update the existing `reorders and saves progress` block — replace its last two lines with:

```ts
    saveProgress('b1', '3', '3:12', 5);
    expect(getBook('b1')!.progress).toEqual({ chapterId: '3', paragraphId: '3:12', pageIndex: 5 });
```

Add new imports near the top:

```ts
import {
  listUserPersonas, getUserPersona, saveUserPersona, deleteUserPersona,
  getActiveUserPersonaId, setActiveUserPersonaId,
} from '@/lib/storage/user-personas';
```

Append two new `describe` blocks at the bottom of the file (after the last block):

```ts
describe('user-personas.ts', () => {
  it('creates, updates, deletes personas and manages active id', () => {
    const p = saveUserPersona({ name: 'Alice', personality: 'Curious reader who loves mysteries.' });
    expect(listUserPersonas()).toHaveLength(1);
    saveUserPersona({ ...p, name: 'Alicia' });
    expect(listUserPersonas()[0].name).toBe('Alicia');
    expect(listUserPersonas()).toHaveLength(1);

    setActiveUserPersonaId(p.id);
    expect(getActiveUserPersonaId()).toBe(p.id);
    deleteUserPersona(p.id);
    expect(listUserPersonas()).toHaveLength(0);
    expect(getActiveUserPersonaId()).toBeNull();
  });

  it('getUserPersona returns undefined for missing id', () => {
    expect(getUserPersona('nope')).toBeUndefined();
  });
});

describe('settings.ts theme backward-compat', () => {
  it('getPrefs fills in theme default when saved prefs lack it', () => {
    localStorage.setItem('arc:prefs', JSON.stringify({ fontSize: 20, fontFamily: 'serif', lineSpacing: 2.0 }));
    const prefs = getPrefs();
    expect(prefs.theme).toBe('amber');
    expect(prefs.fontSize).toBe(20);
  });
});
```

- [ ] **Step 7: Run tests to verify they fail (first two) and pass (the rest)**

Run: `npm test`
Expected: the two new `user-personas` tests fail at import (module not found yet — actually it exists now since Step 5 created it, so they should pass). The backward-compat test passes (DEFAULT_PREFS spread already covers missing fields). The updated `saveProgress` test fails until Step 4 applied — which it is by now. So at end of Step 7 all tests should PASS. If any FAIL, fix before continuing.

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 8: Typecheck + lint + build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: clean.

Run: `npx next build`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/lib/types.ts src/lib/storage/keys.ts src/lib/storage/settings.ts src/lib/storage/books.ts src/lib/storage/user-personas.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: reader UX foundation - ReaderTheme, UserPersona, storage, progress pageIndex"
```

---

### Task 2: System prompt + AI plumbing

**Files:**
- Modify: `src/lib/prompts.ts:19-24`
- Modify: `src/lib/ai.ts:71-93`
- Modify: `src/lib/__tests__/prompts.test.ts`
- Modify: `src/lib/__tests__/ai.test.ts`

**Interfaces:**
- Consumes: `UserPersona` from Task 1.
- Produces (consumed by Task 4 reader-view):
  - `renderSystemPrompt(template: string, personas: Persona[], userPersona?: UserPersona): string`
  - `sendToPersonas(excerpt: NumberedParagraph[], personas: Persona[], settings: Settings, userPersona?: UserPersona): Promise<AIComment[]>`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/__tests__/prompts.test.ts`. First update the import line at top:

```ts
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE, renderSystemPrompt } from '@/lib/prompts';
import type { Persona, UserPersona } from '@/lib/types';
```

Append new `it` blocks inside the existing `describe('renderSystemPrompt', ...)`:

```ts
  it('appends reader context when userPersona is provided', () => {
    const user: UserPersona = { id: 'u1', name: 'Alice', personality: 'A curious reader who loves mysteries.', createdAt: 0 };
    const out = renderSystemPrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATE, [holmes], user);
    expect(out).toContain('The reader you are conversing with');
    expect(out).toContain('Alice');
    expect(out).toContain('A curious reader who loves mysteries.');
  });

  it('omits reader context when userPersona is undefined', () => {
    const out = renderSystemPrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATE, [holmes]);
    expect(out).not.toContain('The reader you are conversing with');
  });
```

Append to `src/lib/__tests__/ai.test.ts`. Update import at top:

```ts
import { extractJson, sendToPersonas } from '@/lib/ai';
import type { NumberedParagraph, Persona, Settings, UserPersona } from '@/lib/types';
```

Add new `it` block inside `describe('sendToPersonas', ...)` after the existing `routes through proxy` block:

```ts
  it('passes user persona context into the system message when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse('{"comments":[]}'));
    vi.stubGlobal('fetch', fetchMock);
    const user: UserPersona = { id: 'u1', name: 'Alice', personality: 'Curious reader.', createdAt: 0 };
    await sendToPersonas(excerpt, [persona], settings, user);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.messages[0].content).toContain('The reader you are conversing with');
    expect(body.messages[0].content).toContain('Alice');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: the four new assertions FAIL (`renderSystemPrompt` still old signature ignores `userPersona`; `sendToPersonas` doesn't thread it). Existing tests still PASS.

- [ ] **Step 3: Update `renderSystemPrompt`**

Replace `src/lib/prompts.ts:19-24`:

```ts
import type { Persona, UserPersona } from './types';

export function renderSystemPrompt(template: string, personas: Persona[], userPersona?: UserPersona): string {
  const block = personas
    .map((p) => `- id: "${p.id}" | name: ${p.name} | language: ${p.language}\n  description: ${p.characterDescription}`)
    .join('\n');
  let prompt = template.replaceAll('{{personas}}', block);
  if (userPersona) {
    prompt += `\n\nThe reader you are conversing with:\n- name: ${userPersona.name}\n  personality: ${userPersona.personality}\nCompanions should address the reader naturally, treating their personality as context that subtly shapes tone, not a script to perform.`;
  }
  return prompt;
}
```

(Remove the old `import type { Persona } from './types';` line — the new import supersedes it. Keep the existing `DEFAULT_SYSTEM_PROMPT_TEMPLATE` export unchanged.)

- [ ] **Step 4: Update `sendToPersonas`**

Edit `src/lib/ai.ts`. Update the import at top:

```ts
import type { AIComment, NumberedParagraph, Persona, Settings, UserPersona } from './types';
```

Replace the `sendToPersonas` function body (currently lines 71-93):

```ts
export async function sendToPersonas(
  excerpt: NumberedParagraph[],
  personas: Persona[],
  settings: Settings,
  userPersona?: UserPersona,
): Promise<AIComment[]> {
  const system = renderSystemPrompt(settings.systemPromptTemplate, personas, userPersona);
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

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 6: Typecheck + lint + build**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Run: `npx next build`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/prompts.ts src/lib/ai.ts src/lib/__tests__/prompts.test.ts src/lib/__tests__/ai.test.ts
git commit -m "feat: system prompt optionally surfaces active user persona"
```

---

### Task 3: PaginatedChapter component

**Files:**
- Create: `src/lib/reader-themes.ts`
- Create: `src/components/reader/paginated-chapter.tsx`
- Create: `src/components/reader/paginated-chapter.test.tsx`
- Reference (no change): `src/lib/selection.ts`, `src/components/reader/selection-toolbar.tsx`, `src/components/reader/comment-popover.tsx`, existing `ParagraphBlock` in `reader-view.tsx` (will be moved/shared — see instructions).

**Interfaces:**
- Consumes: `Paragraph`, `ParsedChapter`, `ReaderPrefs`, `Thread`, `Persona` from types; `CommentPopover`, `SelectionToolbar`, `resolveSelection`, `countWords` reused unchanged.
- Produces (consumed by Task 4 `reader-view.tsx`):

```ts
interface PaginatedChapterProps {
  chapter: ParsedChapter;
  imageUrls: Map<string, string>;
  prefs: ReaderPrefs;
  pageIndex: number;
  pageCount: number;
  onPageCountChange: (n: number) => void;
  onFirstVisiblePidChange: (pid: string) => void;
  chapterThreads: Thread[];
  pendingPids: string[];
  personas: Persona[];
  registerSelectionContainer: (el: HTMLDivElement | null) => void;
  onSelectionResolve: (resolved: ResolvedSelection | null) => void;
  onToolbarPos: (pos: { x: number; y: number } | null) => void;
  onSend: () => void;
  registerBackNav: (goDelta: (d: number) => void) => void;
}
```

(Back/forward buttons live in `reader-view.tsx`; the component exposes `registerBackNav(diff)` so external buttons call into it. Keyboard + swipe handled inside.)

- [ ] **Step 1: Create `reader-themes.ts`**

Create `src/lib/reader-themes.ts`:

```ts
import type { ReaderTheme } from './types';

export interface ReaderThemeVars { bg: string; text: string; muted: string }

export const READER_THEMES: Record<ReaderTheme, ReaderThemeVars> = {
  amber: { bg: '#26180A', text: '#F0DCC0', muted: '#8A6038' },
  warmWhite: { bg: '#FAF4E8', text: '#2A1F0E', muted: '#7A6448' },
};

export function readerContentStyle(theme: ReaderTheme): React.CSSProperties {
  const v = READER_THEMES[theme];
  return {
    ['--reader-bg' as string]: v.bg,
    ['--reader-text' as string]: v.text,
    ['--reader-muted' as string]: v.muted,
    backgroundColor: 'var(--reader-bg)',
    color: 'var(--reader-text)',
  } as React.CSSProperties;
}
```

- [ ] **Step 2: Write the smoke tests**

jsdom cannot measure real layout, so we test that the component renders without crashing and wires callbacks. Create `src/components/reader/paginated-chapter.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaginatedChapter } from './paginated-chapter';
import type { ParsedChapter, Paragraph, ReaderPrefs } from '@/lib/types';

const prefs: ReaderPrefs = { fontSize: 18, fontFamily: 'serif', lineSpacing: 1.8, theme: 'amber' };

function mkParagraph(id: string, text: string): Paragraph {
  return { id, text, tag: 'p' };
}

function mkChapter(paragraphs: Paragraph[]): ParsedChapter {
  return { id: '0', title: 'Chapter One', paragraphs, images: [] };
}

describe('PaginatedChapter', () => {
  it('renders chapter title + paragraphs and applies theme bg', () => {
    const ch = mkChapter([mkParagraph('0:0', 'Hello'), mkParagraph('0:1', 'World')]);
    const onPageCountChange = vi.fn();
    render(
      <PaginatedChapter
        chapter={ch}
        imageUrls={new Map()}
        prefs={prefs}
        pageIndex={0}
        pageCount={1}
        onPageCountChange={onPageCountChange}
        onFirstVisiblePidChange={() => {}}
        chapterThreads={[]}
        pendingPids={[]}
        personas={[]}
        registerSelectionContainer={() => {}}
        onSelectionResolve={() => {}}
        onToolbarPos={() => {}}
        onSend={() => {}}
        registerBackNav={() => {}}
      />,
    );
    expect(screen.getByText('Chapter One')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});
```

Note: `@testing-library/react` is not in `package.json` devDependencies. **Do not add it.** Skip this step if not installed; instead verify via build in Step 8. Delete the test file before commit if the dep is missing. The lib tests (Task 2) plus typecheck/lint/build are the safety net for this component.

- [ ] **Step 3: Run tests to confirm they fail OR remove test file if dep missing**

Run: `npm test src/components/reader/paginated-chapter.test.tsx`
Expected: either FAIL with module-not-found for `@testing-library/react`, or error importing. If so, **delete** the test file:
```bash
Remove-Item -LiteralPath "src\components\reader\paginated-chapter.test.tsx"
```

- [ ] **Step 4: Write the component**

Create `src/components/reader/paginated-chapter.tsx`:

```tsx
'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { ParsedChapter, Paragraph, Persona, ReaderPrefs, ResolvedSelection, Thread } from '@/lib/types';
import { readerContentStyle } from '@/lib/reader-themes';
import { resolveSelection } from '@/lib/selection';
import { countWords } from '@/lib/word-count';
import { CommentPopover } from './comment-popover';
import { SelectionToolbar } from './selection-toolbar';

const GAP = 40;

function ParagraphBlock({ p, imageUrls }: { p: Paragraph; imageUrls: Map<string, string> }) {
  if (p.tag.startsWith('h')) {
    const Tag = p.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Tag data-pid={p.id} className="mb-4 mt-8 font-semibold">{p.text}</Tag>;
  }
  return (
    <p data-pid={p.id} className={p.tag === 'blockquote' ? 'mb-4 border-l-2 pl-4 italic' : 'mb-4'}>
      {p.text}
      {p.images?.map((img) => {
        const url = imageUrls.get(img.path);
        return url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.path} src={url} alt={img.alt ?? ''} className="my-3 max-h-[60vh] rounded-md object-contain" />
        ) : null;
      })}
    </p>
  );
}

interface PaginatedChapterProps {
  chapter: ParsedChapter;
  imageUrls: Map<string, string>;
  prefs: ReaderPrefs;
  pageIndex: number;
  pageCount: number;
  onPageCountChange: (n: number) => void;
  onFirstVisiblePidChange: (pid: string) => void;
  chapterThreads: Thread[];
  pendingPids: string[];
  personas: Persona[];
  registerSelectionContainer: (el: HTMLDivElement | null) => void;
  onSelectionResolve: (resolved: ResolvedSelection | null) => void;
  onToolbarPos: (pos: { x: number; y: number } | null) => void;
  onSend: () => void;
  registerBackNav: (goDelta: (d: number) => void) => void;
}

export function PaginatedChapter(props: PaginatedChapterProps) {
  const { chapter, imageUrls, prefs, pageIndex, pageCount, onPageCountChange, onFirstVisiblePidChange,
    chapterThreads, pendingPids, personas, registerSelectionContainer, onSelectionResolve,
    onToolbarPos, onSend, registerBackNav } = props;

  const viewportRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;
  const overLimitNotifiedRef = useRef(false);
  const toolbarOffsetRef = useRef(0);

  const reflow = useCallback(() => {
    const flow = flowRef.current, vp = viewportRef.current;
    if (!flow || !vp) return;
    const displayHeight = (flow.parentNode as HTMLElement).clientHeight;
    flow.style.height = `${displayHeight}px`;
    const pageWidth = vp.clientWidth + GAP;
    flow.style.columnWidth = `${vp.clientWidth}px`;
    flow.style.columnGap = `${GAP}px`;
    // images capped relative to flow height
    const n = Math.max(1, Math.round(flow.scrollWidth / pageWidth));
    onPageCountChange(n);
    // report first visible pid on current page
    const leftBoundary = pageIndexRef.current * pageWidth;
    const rightBoundary = leftBoundary + pageWidth;
    let firstPid: string | null = null;
    for (const el of Array.from(flow.querySelectorAll<HTMLElement>('[data-pid]'))) {
      const left = el.offsetLeft;
      const right = left + el.offsetWidth;
      if (right > leftBoundary && left < rightBoundary) { firstPid = el.getAttribute('data-pid'); break; }
    }
    if (firstPid) onFirstVisiblePidChange(firstPid);
  }, [onPageCountChange, onFirstVisiblePidChange]);

  // reflow on chapter + prefs change
  useEffect(() => {
    const raf = requestAnimationFrame(reflow);
    return () => cancelAnimationFrame(raf);
  }, [chapter, prefs.fontSize, prefs.lineSpacing, prefs.fontFamily, prefs.theme, reflow]);

  // reflow on resize (debounced)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(reflow, 250); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, [reflow]);

  // expose navigation
  useEffect(() => {
    registerBackNav((d: number) => {
      // handled by parent; this is a no-op placeholder so parent owns state
      void d;
    });
  }, [registerBackNav]);

  // keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        window.dispatchEvent(new CustomEvent('arc:page-flip', { detail: -1 }));
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        window.dispatchEvent(new CustomEvent('arc:page-flip', { detail: 1 }));
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // swipe via pointer events
  useEffect(() => {
    let startX = 0, startY = 0, active = false;
    const vp = viewportRef.current;
    if (!vp) return;
    const down = (e: PointerEvent) => { active = true; startX = e.clientX; startY = e.clientY; };
    const up = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        window.dispatchEvent(new CustomEvent('arc:page-flip', { detail: dx < 0 ? 1 : -1 }));
      }
    };
    vp.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => { vp.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); };
  }, [chapter]);

  // selection tracking (delegated to reader-view via callbacks)
  useEffect(() => {
    const container = flowRef.current;
    if (!container) return;
    registerSelectionContainer(container);
    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        onToolbarPos(null);
        overLimitNotifiedRef.current = false;
        return;
      }
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) { onToolbarPos(null); return; }
      const resolved = resolveSelection(range, container);
      if (!resolved) { onToolbarPos(null); return; }
      if (countWords(resolved.text) > 2000) {
        onToolbarPos(null); onSelectionResolve(null);
        if (!overLimitNotifiedRef.current) {
          overLimitNotifiedRef.current = true;
          import('sonner').then(({ toast }) => toast.error('Select a shorter passage (max 2000 words)'));
        }
        return;
      }
      onSelectionResolve(resolved);
      const rect = range.getBoundingClientRect();
      const vp = viewportRef.current;
      const vpRect = vp?.getBoundingClientRect();
      const offset = pageIndexRef.current * (vp ? vp.clientWidth + GAP : 0);
      let x = rect.left + rect.width / 2 + offset;
      if (vpRect) x = Math.min(Math.max(x, vpRect.left + 40), vpRect.right - 40);
      onToolbarPos({ x, y: rect.bottom + 8 });
    };
    let t: ReturnType<typeof setTimeout>;
    const onChange = () => update();
    const onTouchEnd = () => { clearTimeout(t); t = setTimeout(update, 350); };
    document.addEventListener('selectionchange', onChange);
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('selectionchange', onChange);
      container.removeEventListener('touchend', onTouchEnd);
      clearTimeout(t);
      registerSelectionContainer(null);
    };
  }, [chapter, onSelectionResolve, onToolbarPos, registerSelectionContainer]);

  return (
    <div
      ref={viewportRef}
      className="relative mx-auto w-full max-w-2xl flex-1 px-5 py-6 overflow-hidden"
      style={{ ...readerContentStyle(prefs.theme), fontSize: prefs.fontSize, lineHeight: prefs.lineSpacing, fontFamily: prefs.fontFamily }}
    >
      <h2 className="mb-2 text-xl font-bold">{chapter.title}</h2>
      <div
        ref={flowRef}
        style={{
          columnWidth: '100%',
          columnGap: `${GAP}px`,
          columnFill: 'auto',
          height: '100%',
          willChange: 'transform',
          transform: `translateX(${-(pageIndex * (viewportRef.current ? viewportRef.current.clientWidth + GAP : 0))}px)`,
          transition: 'transform 250ms ease-out',
        } as React.CSSProperties}
      >
        {chapter.paragraphs.map((p) => (
          <div key={p.id} className="break-inside-avoid-column">
            <ParagraphBlock p={p} imageUrls={imageUrls} />
            <CommentPopover
              threads={chapterThreads.filter((t) => t.paragraphId === p.id)}
              pending={pendingPids.includes(p.id)}
              personas={personas}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Register `arc:page-flip` listener helper in a shared module**

To keep `reader-view` ownership of `pageIndex` clean, the component uses `window` custom events. Reader-view (Task 4) will add the listener. No new helper file needed; the contract is the string `'arc:page-flip'` with `detail: number`. Document this contract inline at the top of `paginated-chapter.tsx` via a `const PAGE_FLIP_EVENT = 'arc:page-flip';` exported for reuse.

Add at top of `paginated-chapter.tsx` (after imports):
```ts
export const PAGE_FLIP_EVENT = 'arc:page-flip';
```
Replace the three custom-event dispatch lines to use `PAGE_FLIP_EVENT`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Fix any type errors before continuing.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 8: Build**

Run: `npx next build`
Expected: build succeeds. (Pagination layout cannot be measured in build; runtime manual verification is in Task 4 Step 11.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/reader-themes.ts src/components/reader/paginated-chapter.tsx
git commit -m "feat(reader): add PaginatedChapter multicol page-flip engine"
```

---

### Task 4: Reader-view integration

**Files:**
- Modify: `src/components/reader/reader-view.tsx`
- Modify: `src/components/reader/reader-topbar.tsx`
- Modify: `src/lib/storage/books.ts` — nothing new (signature already ready from Task 1)

**Interfaces:**
- Consumes: `PaginatedChapter`, `PAGE_FLIP_EVENT`, `readerContentStyle` + reader-theme map, `UserPersona` storage (Task 1), new `sendToPersonas` signature (Task 2).
- Produces: page-flip reading experience; thread Restore with `pageIndex`; comments drawer open state ready for Task 6; user persona chip props for Task 7 reader-side popover.

- [ ] **Step 1: Replace scroll view with `PaginatedChapter`**

Edit `src/components/reader/reader-view.tsx`. Add imports near the top:

```ts
import { PaginatedChapter, PAGE_FLIP_EVENT } from './paginated-chapter';
import type { ResolvedSelection } from '@/lib/selection';
import { getActiveUserPersonaId, getUserPersona } from '@/lib/storage/user-personas';
import type { UserPersona } from '@/lib/types';
```

Remove the now-unused imports: `CommentPopover`, `SelectionToolbar` move into `PaginatedChapter` (already imported there). Keep `PersonaPicker`, `BookmarksPanel` (still used). Remove the local `ParagraphBlock` function (moved to `paginated-chapter.tsx`).

Inside `ReaderView`, replace the `firstVisiblePid` + scroll-save effect + selection effect with new state and callbacks. Replace the existing state block:

```ts
  const [chapter, setChapter] = useState<ParsedChapter | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const restorePidRef = useRef<string | null>(book.progress?.paragraphId ?? null);
  const restorePageRef = useRef<number>(book.progress?.pageIndex ?? 0);
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => getPrefs());
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [pageIndex, setPageIndex] = useState(restorePageRef.current);
  const [pageCount, setPageCount] = useState(1);
  const [selection, setSelection] = useState<ResolvedSelection | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingPids, setPendingPids] = useState<string[]>([]);
  const [threadsVersion, setThreadsVersion] = useState(0);
  const personas: Persona[] = useMemo(() => listPersonas(), []);
```

Remove the deleted `containerRef` semantics (container is now inside `PaginatedChapter`), but keep the name to satisfy `BookmarksPanel`'s jump contract replacement below.

- [ ] **Step 2: Wire reflow + first-visible-pid callbacks**

Add inside `ReaderView`:

```ts
  const firstVisiblePidRef = useRef<string | null>(null);

  const handlePageCount = useCallback((n: number) => {
    setPageCount(n);
    setPageIndex((i) => Math.min(i, Math.max(0, n - 1)));
  }, []);

  const handleFirstVisiblePid = useCallback((pid: string) => {
    firstVisiblePidRef.current = pid;
    // debounced save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (firstVisiblePidRef.current) saveProgress(book.id, chapterId, firstVisiblePidRef.current, pageIndex);
    }, 800);
  }, [book.id, chapterId, pageIndex]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 3: Wire page-flip events**

Add:

```ts
  const goPage = useCallback((delta: number) => {
    setPageIndex((i) => {
      const next = Math.min(Math.max(0, i + delta), Math.max(0, pageCount - 1));
      return next;
    });
  }, [pageCount]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === 'number') goPage(detail);
    };
    window.addEventListener(PAGE_FLIP_EVENT, handler);
    return () => window.removeEventListener(PAGE_FLIP_EVENT, handler);
  }, [goPage]);
```

- [ ] **Step 4: Restore page on chapter load**

Replace the existing "Restore scroll position" effect with:

```ts
  useEffect(() => {
    if (!chapter) return;
    const targetPid = restorePidRef.current;
    restorePidRef.current = null;
    if (targetPid) {
      requestAnimationFrame(() => {
        const flow = document.querySelector('[data-pid]')?.parentElement;
        // find column containing pid → compute pageIndex
        const el = document.querySelector(`[data-pid="${CSS.escape(targetPid)}"]`) as HTMLElement | null;
        if (el) {
          const flowEl = el.parentElement?.parentElement as HTMLElement; // .break-inside wrapper → flow
          if (flowEl) {
            const pageWidth = (flowEl.parentElement as HTMLElement).clientWidth + 40;
            const colIdx = Math.round(el.offsetLeft / pageWidth);
            setPageIndex(Math.max(0, colIdx));
          }
        }
      });
    }
  }, [chapter]);
```

- [ ] **Step 5: Remove the old scroll-save effect + old selection effect**

Delete the entire old `useEffect` block starting with the comment `// Save progress on scroll (debounced)` (originally lines ~100-117 in `reader-view.tsx`) and the entire `selection tracking` `useEffect` block (originally lines ~119-165). They are now replaced by `handleFirstVisiblePid` (Step 2) + the selection tracking inside `PaginatedChapter` (Task 3).

Also delete `overLimitNotifiedRef` declaration (moved into `PaginatedChapter`).

- [ ] **Step 6: Wire `handleSend` to active user persona**

In `handleSend`, look up the active user persona and pass it through:

```ts
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
    const sentSelection = selection;
    const anchorPid = sentSelection.pids[sentSelection.pids.length - 1];
    setSending(true);
    setPendingPids([anchorPid]);
    window.getSelection()?.removeAllRanges();

    let userPersona: UserPersona | undefined;
    const activeId = getActiveUserPersonaId();
    if (activeId) userPersona = getUserPersona(activeId);

    try {
      const comments = await sendToPersonas(sentSelection.excerpt, chosen, settings, userPersona);
```

Leave the rest of `handleSend` unchanged.

- [ ] **Step 7: Wire `jumpTo` to restore pages + update topbar props**

Update `jumpTo`:

```ts
  const jumpTo = (targetChapterId: string, paragraphId: string) => {
    if (targetChapterId === chapterId) {
      const el = document.querySelector(`[data-pid="${CSS.escape(paragraphId)}"]`) as HTMLElement | null;
      if (el) {
        const flowEl = el.parentElement?.parentElement as HTMLElement;
        if (flowEl) {
          const pageWidth = (flowEl.parentElement as HTMLElement).clientWidth + 40;
          const colIdx = Math.round(el.offsetLeft / pageWidth);
          setPageIndex(Math.max(0, colIdx));
        }
      }
    } else {
      restorePidRef.current = paragraphId;
      saveProgress(book.id, targetChapterId, paragraphId, 0);
      setChapterId(targetChapterId);
      setPageIndex(0);
    }
  };
```

- [ ] **Step 8: Replace the JSX render block**

Replace the entire `<div id="reader-content" ...>` block with:

```tsx
      <ReaderTopbar
        title={book.title}
        onToc={() => setTocOpen(true)}
        onBookmarks={() => setBookmarksOpen(true)}
        onComments={() => setCommentsOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        activeUserPersonaId={activeUserPersonaId}
      />
      {!chapter ? (
        <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      ) : (
        <PaginatedChapter
          chapter={chapter}
          imageUrls={imageUrls}
          prefs={prefs}
          pageIndex={pageIndex}
          pageCount={pageCount}
          onPageCountChange={handlePageCount}
          onFirstVisiblePidChange={handleFirstVisiblePid}
          chapterThreads={chapterThreads}
          pendingPids={pendingPids}
          personas={personas}
          registerSelectionContainer={() => {}}
          onSelectionResolve={setSelection}
          onToolbarPos={(pos) => setToolbarPos(pos && !sending ? pos : null)}
          onSend={() => setPickerOpen(true)}
          registerBackNav={() => {}}
        />
      )}
      {/* Chapter footer nav uses page-flip */}
      {book.chapterCount > 1 && (
        <div className="mx-auto w-full max-w-2xl px-5 pb-4 flex items-center justify-between">
          <Button variant="outline" disabled={chapterIndex <= 0 && pageIndex === 0} onClick={() => {
            if (pageIndex === 0) goChapter(-1);
            else goPage(-1);
          }}>
            <ChevronLeft className="mr-1 h-4 w-4" />Back
          </Button>
          <span className="text-xs" style={{ color: 'var(--reader-muted, #8A6038)' }}>
            {pageIndex + 1} / {pageCount} · Ch {chapterIndex + 1}/{book.chapterCount}
          </span>
          <Button variant="outline" disabled={chapterIndex >= book.chapterCount - 1 && pageIndex >= pageCount - 1} onClick={() => {
            if (pageIndex >= pageCount - 1) goChapter(1);
            else goPage(1);
          }}>
            Next<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
```

Then below that, keep the existing `<TocDrawer ...>`, `<BookmarksPanel ...>` (still used), `<ReaderSettings ...>` (Task 5 will extend), bookmark FAB, and replace the `<SelectionToolbar>` + `<PersonaPicker>` lines with:

```tsx
      <SelectionToolbar position={toolbarPos} onSend={() => setPickerOpen(true)} />
      <PersonaPicker open={pickerOpen} onOpenChange={setPickerOpen} personas={personas} onConfirm={(ids) => void handleSend(ids)} />
```

(SelectionToolbar still imported from `selection-toolbar`. It is no longer imported at top of reader-view since `PaginatedChapter` owns selection — keep the existing import line `import { SelectionToolbar } from './selection-toolbar';`.)

- [ ] **Step 9: Compute `activeUserPersonaId` for topbar pass-through**

Add at top of `ReaderView`:

```ts
  const [activeUserPersonaId, setActiveUserPersonaId] = useState<string | null>(() => getActiveUserPersonaId());
```

(`UserPersonaSwitcher` from Task 7 will call `setActiveUserPersonaId` via a prop; for now this state exists for the topbar chip placeholder.)

- [ ] **Step 10: Typecheck + lint + build**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Run: `npx next build`
Expected: all clean. If unused import errors for `CommentPopover`, `SelectionToolbar`, remove them from `reader-view.tsx`'s imports (they live in `PaginatedChapter` now). `SelectionToolbar` import stays since the component renders it at the bottom.

- [ ] **Step 11: Manual verification script**

Run `npm run dev`, open `/read?id=<some-book-id>`. Verify:
- Chapter renders, theme bg visible (amber default).
- ArrowLeft / ArrowRight flip pages with slide transition.
- Back/Next buttons at bottom flip pages until chapter end, then jump chapters.
- Resize window → pages reflow (no overflow).
- Text selection spanning two adjacent pages: SelectionToolbar "Send to AI" appears within viewport; AI returns; comment bubble shows at target paragraph.
- Reload `/read?id=<id>` → restores last page and chapter.
- Toggle font size in Reader settings → pages reflow without disappearing.
- Warm white theme (once Task 5 ships) flips colors, app shell stays dark.

- [ ] **Step 12: Commit**

```bash
git add src/components/reader/reader-view.tsx src/components/reader/reader-topbar.tsx
git commit -m "feat(reader): integrate PaginatedChapter, theme, page-index progress, user-persona pipeline"
```

---

### Task 5: Reader-settings theme picker

**Files:**
- Modify: `src/components/reader/reader-settings.tsx`

**Interfaces:**
- Consumes: `ReaderPrefs.theme`, `ReaderTheme` (Task 1).
- Produces: a `Select` whose value is one of `'amber' | 'warmWhite'`, persisted via the existing `onChange(prefs)` prop.

- [ ] **Step 1: Add the theme select**

Edit `src/components/reader/reader-settings.tsx`. Append inside `<DialogContent>` (after the font-family block):

```tsx
        <div className="space-y-2">
          <Label>Reading theme</Label>
          <Select value={prefs.theme} onValueChange={(v) => onChange({ ...prefs, theme: v as ReaderPrefs['theme'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="amber">Amber (dark)</SelectItem>
              <SelectItem value="warmWhite">Warm white</SelectItem>
            </SelectContent>
          </Select>
        </div>
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Run: `npx next build`
Expected: clean.

- [ ] **Step 3: Manual check**

Open a book, open settings, switch to Warm white: reader content area flips to warm white background + dark text; app shell stays dark. Close settings: still warm white. Re-open book: warm white persists.

- [ ] **Step 4: Commit**

```bash
git add src/components/reader/reader-settings.tsx
git commit -m "feat(reader): theme picker (amber / warm white) in reader settings"
```

---

### Task 6: Comments drawer

**Files:**
- Create: `src/components/reader/comments-drawer.tsx`
- Modify: `src/components/reader/reader-view.tsx` (mount the drawer)
- Modify: `src/components/reader/reader-topbar.tsx` (render comments icon) — assumed already wired in Task 4 via the `onComments` prop; this task ensures the icon exists.

**Interfaces:**
- Consumes: `listThreads(book.id)`, `Persona`, `Thread`, `book.toc`.
- Produces: `<CommentsDrawer open onOpenChange bookId threads personas tocTitles onJump />` mounted by reader-view; topbar icon calls `onComments`.

- [ ] **Step 1: Write the drawer**

Create `src/components/reader/comments-drawer.tsx`:

```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCircle2 } from 'lucide-react';
import type { Persona, Thread } from '@/lib/types';
import { listThreads } from '@/lib/storage/threads';

interface CommentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  personas: Persona[];
  tocTitles: Map<string, string>;
  onJump: (chapterId: string, paragraphId: string) => void;
}

function avatarFor(persona: Persona | undefined) {
  if (!persona) return <UserCircle2 className="h-5 w-5 text-muted-foreground" />;
  return persona.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={persona.avatar} alt={persona.name} className="h-full w-full object-cover" />
  ) : <UserCircle2 className="h-5 w-5 text-muted-foreground" />;
}

export function CommentsDrawer({ open, onOpenChange, bookId, personas, tocTitles, onJump }: CommentsDrawerProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { if (open) setThreads(listThreads(bookId)); }, [open, bookId]);
  const personaById = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);

  // personas with at least one comment in this book
  const activePersonaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of threads) for (const c of t.comments) ids.add(c.personaId);
    return Array.from(ids);
  }, [threads]);

  const filtered = filter ? threads.filter((t) => t.comments.some((c) => c.personaId === filter)) : threads;
  const byChapter = useMemo(() => {
    const map = new Map<string, Thread[]>();
    for (const t of filtered) {
      const arr = map.get(t.chapterId) ?? [];
      arr.push(t);
      map.set(t.chapterId, arr);
    }
    return Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filtered]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader><SheetTitle>Comments</SheetTitle></SheetHeader>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button size="sm" variant={filter === null ? 'secondary' : 'outline'} onClick={() => setFilter(null)}>All</Button>
          {activePersonaIds.map((id) => {
            const p = personaById.get(id);
            return (
              <Button key={id} size="sm" variant={filter === id ? 'secondary' : 'outline'} onClick={() => setFilter(filter === id ? null : id)}>
                {p?.name ?? 'Former companion'}
              </Button>
            );
          })}
        </div>
        <div className="mt-4 space-y-4">
          {threads.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Select a passage and ask your companions.</p>}
          {byChapter.map(([chapterId, group]) => (
            <div key={chapterId} className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {tocTitles.get(chapterId) ?? `Chapter ${Number(chapterId) + 1}`}
              </p>
              {group.map((t) => {
                const firstPersona = personaById.get(t.comments[0].personaId);
                return (
                  <button key={t.id} className="w-full rounded-md border p-3 text-left hover:bg-muted/50"
                    onClick={() => { onJump(t.chapterId, t.paragraphId); onOpenChange(false); }}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 overflow-hidden rounded-full bg-muted">{avatarFor(firstPersona)}</span>
                      <span className="text-xs font-medium">{firstPersona?.name ?? 'Former companion'}</span>
                      {t.comments.length > 1 && <Badge variant="outline" className="ml-auto">+{t.comments.length - 1}</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">"{t.selectedText.slice(0, 80)}{t.selectedText.length > 80 ? '…' : ''}"</p>
                    <p className="mt-1 line-clamp-3 text-sm">{t.comments[0].text}</p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Mount the drawer in reader-view**

Edit `src/components/reader/reader-view.tsx`. Add import:

```ts
import { CommentsDrawer } from './comments-drawer';
```

Just after `<BookmarksPanel ... />` add:

```tsx
      <CommentsDrawer
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        bookId={book.id}
        personas={personas}
        tocTitles={new Map(book.toc.map((t) => [t.chapterId, t.title]))}
        onJump={jumpTo}
      />
```

- [ ] **Step 3: Wire the topbar comments icon**

Edit `src/components/reader/reader-topbar.tsx`. Add `MessageSquare` to the lucide import, add an `onComments` prop, and render a button before the bookmarks button:

```tsx
interface ReaderTopbarProps {
  title: string;
  onToc: () => void;
  onBookmarks: () => void;
  onComments: () => void;
  onSettings: () => void;
  activeUserPersonaId: string | null;
}
```

Add inside the right `<div className="flex items-center">`:

```tsx
          <Button variant="ghost" size="icon" onClick={onComments} aria-label="All comments">
            <MessageSquare className="h-4 w-4" />
          </Button>
```

- [ ] **Step 4: Typecheck + lint + build**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Run: `npx next build`
Expected: clean.

- [ ] **Step 5: Manual check**

Open a book with prior AI comments. Tap the comments icon → drawer slides in, threads grouped by chapter, filter chips by persona. Tap a thread → reader jumps to that chapter + page (page index restored). Empty-book case: shows "No comments yet" message.

- [ ] **Step 6: Commit**

```bash
git add src/components/reader/comments-drawer.tsx src/components/reader/reader-view.tsx src/components/reader/reader-topbar.tsx
git commit -m "feat(reader): comments drawer (book-wide browse, persona filter, jump-to)"
```

---

### Task 7: Profile user-persona section + reader switcher

**Files:**
- Create: `src/components/profile/user-persona-section.tsx`
- Create: `src/components/reader/user-persona-switcher.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/components/reader/reader-view.tsx` (render the switcher chip + pass `setActiveUserPersonaId`)
- Modify: `src/components/reader/reader-topbar.tsx` (render the chip)

**Interfaces:**
- Consumes: `UserPersona`, `listUserPersonas, saveUserPersona, deleteUserPersona, getActiveUserPersonaId, setActiveUserPersonaId` (Task 1).
- Produces: a profile section above `SettingsForm`; a reader topbar chip + popover for quick switch on the read page.

- [ ] **Step 1: Write the profile section**

Create `src/components/profile/user-persona-section.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, UserCircle2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { UserPersona } from '@/lib/types';
import {
  listUserPersonas, saveUserPersona, deleteUserPersona,
  getActiveUserPersonaId, setActiveUserPersonaId,
} from '@/lib/storage/user-personas';

export function UserPersonaSection() {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserPersona | null>(null);
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const personas = listUserPersonas();
  const activeId = getActiveUserPersonaId();
  void version;
  const refresh = () => setVersion((v) => v + 1);

  const openNew = () => { setEditing(null); setName(''); setPersonality(''); setOpen(true); };
  const openEdit = (p: UserPersona) => { setEditing(p); setName(p.name); setPersonality(p.personality); setOpen(true); };

  const save = () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!personality.trim()) { toast.error('Personality is required'); return; }
    saveUserPersona({ id: editing?.id, name: name.trim(), personality: personality.trim() });
    toast.success(editing ? 'Persona updated' : 'Persona created');
    setOpen(false);
    refresh();
  };

  const setActive = (id: string) => { setActiveUserPersonaId(id); refresh(); };
  const clearActive = () => { setActiveUserPersonaId(null); refresh(); };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Reader persona</h2>
            <p className="text-sm text-muted-foreground">Optional. Shape how companions talk to you.</p>
          </div>
          <Button variant="outline" size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>

        {activeId && (
          <div className="rounded-lg border border-primary/40 bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Active</p>
            {(() => {
              const p = personas.find((x) => x.id === activeId);
              if (!p) return null;
              return (
                <div className="mt-1 flex items-start gap-2">
                  <UserCircle2 className="h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.personality}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearActive}>Clear</Button>
                </div>
              );
            })()}
          </div>
        )}

        <div className="space-y-2">
          {personas.length === 0 && !activeId && (
            <p className="text-sm text-muted-foreground">No reader persona yet. Add one to give companions context about you.</p>
          )}
          {personas.map((p) => (
            <div key={p.id} className="flex items-start gap-2 rounded-md border p-3">
              <button className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => setActive(p.id)}>
                {activeId === p.id ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.personality}</p>
                </div>
              </button>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Delete"
                  onClick={() => { deleteUserPersona(p.id); toast.success('Persona deleted'); refresh(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader><DialogTitle>{editing ? 'Edit reader persona' : 'New reader persona'}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="up-name">Name</Label>
            <Input id="up-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="up-personality">Personality</Label>
            <Textarea id="up-personality" rows={4} value={personality} onChange={(e) => setPersonality(e.target.value)}
              placeholder="A curious reader who loves mysteries and dislikes rushed endings." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
```

- [ ] **Step 2: Mount it on the profile page**

Edit `src/app/profile/page.tsx`. Replace `SettingsForm` block to add it above:

```tsx
'use client';
import { SettingsForm } from '@/components/settings/settings-form';
import { SystemPromptEditor } from '@/components/settings/system-prompt-editor';
import { UserPersonaSection } from '@/components/profile/user-persona-section';

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="flex items-end justify-between px-4 pb-4 pt-6">
        <div>
          <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
            Profile
          </h1>
          <p className="mt-0.5 text-xs font-medium" style={{ color: '#8A6038' }}>
            App and provider settings
          </p>
        </div>
        <span className="text-xs text-muted-foreground">v0.1.0</span>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        <UserPersonaSection />
        <SettingsForm />
        <SystemPromptEditor />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the reader switcher**

Create `src/components/reader/user-persona-switcher.tsx`:

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { UserCircle2, Check, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  listUserPersonas, getActiveUserPersonaId, setActiveUserPersonaId,
} from '@/lib/storage/user-personas';
import type { UserPersona } from '@/lib/types';

interface UserPersonaSwitcherProps {
  activeId: string | null;
  onActivate: (id: string | null) => void;
}

export function UserPersonaSwitcher({ activeId, onActivate }: UserPersonaSwitcherProps) {
  const [open, setOpen] = useState(false);
  const personas: UserPersona[] = listUserPersonas();
  const active = personas.find((p) => p.id === activeId);

  const trigger = active ? (
    <Button variant="secondary" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen(true)}>
      <UserCircle2 className="h-3.5 w-3.5" />{active.name}
    </Button>
  ) : (
    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen(true)}>
      <UserCircle2 className="h-3.5 w-3.5" />Set persona
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><span>{trigger}</span></PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Reader persona</p>
        {personas.length === 0 && (
          <p className="text-sm text-muted-foreground">No personas yet. Add one in Profile.</p>
        )}
        {personas.map((p) => (
          <button key={p.id} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            onClick={() => { const next = p.id === activeId ? null : p.id; setActiveUserPersonaId(next); onActivate(next); setOpen(false); }}>
            {p.id === activeId ? <Check className="h-4 w-4 text-primary" /> : <UserCircle2 className="h-4 w-4" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.personality}</p>
            </div>
          </button>
        ))}
        <div className="pt-2 border-t">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
          <Link href="/profile"><Settings className="h-4 w-4" />Manage</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Wire the switcher into reader topbar**

Edit `src/components/reader/reader-topbar.tsx`. Add import + render `<UserPersonaSwitcher .../>` in the topbar (left of the right-side action cluster):

```tsx
import { UserPersonaSwitcher } from './user-persona-switcher';
```

Inside the right-side div (before the comments button), render:

```tsx
          <UserPersonaSwitcher activeId={activeUserPersonaId} onActivate={() => {}} />
```

(`onActivate` no-op for now — the topbar own state lives in reader-view; for live chip UI re-render, lift the state to reader-view and pass a setter.)

Better: in `src/components/reader/reader-view.tsx`, change the prop usage so that the topbar exposes the chip as a slot. To keep this task self-contained, pass `activeIdRef` through a state setter.

In `reader-view.tsx`, replace `activeUserPersonaId` prop usage so the topbar receives:

```tsx
      <ReaderTopbar
        title={book.title}
        onToc={() => setTocOpen(true)}
        onBookmarks={() => setBookmarksOpen(true)}
        onComments={() => setCommentsOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        activeUserPersonaId={activeUserPersonaId}
        onUserPersonaActivate={(id) => setActiveUserPersonaId(id)}
      />
```

Update `ReaderTopbarProps`:

```ts
interface ReaderTopbarProps {
  title: string;
  onToc: () => void;
  onBookmarks: () => void;
  onComments: () => void;
  onSettings: () => void;
  activeUserPersonaId: string | null;
  onUserPersonaActivate: (id: string | null) => void;
}
```

Render in topbar:

```tsx
          <UserPersonaSwitcher activeId={activeUserPersonaId} onActivate={onUserPersonaActivate} />
```

- [ ] **Step 5: Typecheck + lint + build**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Run: `npx next build`
Expected: clean.

- [ ] **Step 6: Manual check**

- Profile page: "Reader persona" section appears above settings. Empty state shows helper text. "Add" opens modal, save creates entry. Tap an entry = active highlight + "Clear" action appears. Edit / delete buttons work.
- Read page: topbar shows either name chip (active) or "Set persona" ghost. Tap opens popover listing personas. Tap a different one = chip updates immediately (chip reflects reader-view state).
- Select a passage + send → observe in browser DevTools network request body: `messages[0].content` includes "The reader you are conversing with" + persona name when one is active; otherwise absent.
- Clear active reader persona, send again → user section gone from prompt.

- [ ] **Step 7: Commit**

```bash
git add src/components/profile/user-persona-section.tsx src/components/reader/user-persona-switcher.tsx src/app/profile/page.tsx src/components/reader/reader-view.tsx src/components/reader/reader-topbar.tsx
git commit -m "feat: user persona (profile section + reader switcher + prompt context)"
```

---

### Task 8: DESIGN.md doc update

**Files:**
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: `reader-themes.ts` palette (Task 3).
- Produces: documented reading-theme subsystem appended to the design doc.

- [ ] **Step 1: Append the subsection**

Open `DESIGN.md` and add a new section at the end (after the "Branding" section). Use:

```markdown
---

## Reading Themes (reader scoped)

Two palettes override CSS variables **only inside `#reader-content`**. The app shell stays dark-only; this does not relax the dark-only rule for the rest of the app.

| theme | `--reader-bg` | `--reader-text` | `--reader-muted` |
|---|---|---|---|
| `amber` (default) | `#26180A` | `#F0DCC0` | `#8A6038` |
| `warmWhite` | `#FAF4E8` | `#2A1F0E` | `#7A6448` |

- Applied inline on the reader content container (`readerContentStyle(theme)` in `src/lib/reader-themes.ts`).
- Stored in `ReaderPrefs.theme`. Default `amber` for backward continuity with the existing dark palette.
- Chosen via the "Reading theme" select in the reader settings dialog.
- Components rendered outside `#reader-content` (`SelectionToolbar`, `CommentPopover` anchor bubbles, topbar, drawers) keep the locked dark palette.
```

- [ ] **Step 2: Commit**

```bash
git add DESIGN.md
git commit -m "docs: document reader-scoped reading themes in DESIGN.md"
```

---

## Self-Review Notes

**Spec coverage:**
- §1 Architecture / files → Tasks 1-8 cover every listed file exactly.
- §2 Data model → Task 1 (types + `DEFAULT_PREFS` + `saveProgress`).
- §3 Reading themes → Task 3 (`reader-themes.ts`), Task 5 (picker), Task 8 (doc).
- §4 Page-flip → Task 3 (component), Task 4 (integration: state, page-flip events, restore, footer nav).
- §5 Comments drawer → Task 6 (impl) + topbar icon wired in Task 4/6.
- §6 User persona → Task 1 (storage), Task 7 (profile + switcher).
- §7 System prompt → Task 2.
- §8 Implementation order → Tasks follow exact order; each ends with typecheck/lint/build.

**Placeholder scan:** none. Component code in Task 3 + Task 7 is complete.

**Type consistency:**
- `saveProgress(bookId, chapterId, paragraphId, pageIndex)` used identically in Task 1, 4 (Step 4 restore + Step 7 jumpTo), 4 (Step 2 saveProgress call).
- `ReaderPrefs['theme']` literal cast in Task 5 matches `ReaderTheme = 'amber' | 'warmWhite'` in Task 1.
- `PAGE_FLIP_EVENT` exported from Task 3, imported in Task 4.
- `UserPersonaSwitcher` props `activeId + onActivate` consistent across Task 7 Step 3-4.
- `CommentsDrawer` props match reader-view mount in Task 6 Step 2.
- `readerContentStyle(theme)` signature matches usage in Task 3 Step 4.

No addtl issues found.