# Design: Reader UX Improvements (5 Features)

Date: 2026-07-22
Status: Approved (sans yellow theme)

## Scope

Single combined spec covering five reader UX improvements:

1. Flip pages instead of scroll (paginated slide)
2. Reading themes on the read page (amber default + warm white; yellow dropped per approval)
3. Browse all AI comments for a book (reader drawer)
4. User persona (reader-side, mirrors companion persona) — name + personality, multiple stored, quick switch
5. System prompt modified so companions see active user persona as context

Decomposition: one combined spec, one implementation plan.

## Design constraints

- Stack: Next.js (App Router) + React + TS + Tailwind + shadcn/ui. See `DESIGN.md`.
- Local-only storage (localStorage via `lib/storage/local.ts`, IndexedDB for chapter blobs). No server / no new deps.
- DESIGN.md states "Dark only, locked" for app shell. Reading themes are scoped overrides inside `#reader-content` only — app shell stays dark. Adds a "Reading themes (reader scoped)" subsection to DESIGN.md.

---

## §1 Architecture / files

New / changed:

- `src/lib/types.ts`:
  - add `ReaderTheme = 'amber' | 'warmWhite'`
  - add `theme: ReaderTheme` to `ReaderPrefs`
  - add `UserPersona { id, name, personality, createdAt }`
  - extend `Book.progress` to `{ chapterId: string; paragraphId: string; pageIndex: number }`
- `src/lib/storage/keys.ts`: add `K.userPersonas = 'arc:userPersonas'`, `K.activeUserPersona = 'arc:activeUserPersona'`
- `src/lib/storage/user-personas.ts` (new): CRUD clone of `personas.ts`
  - `listUserPersonas, getUserPersona, saveUserPersona, deleteUserPersona`
  - `getActiveUserPersonaId(): string | null`, `setActiveUserPersonaId(id | null)`
- `src/lib/prompts.ts`: `renderSystemPrompt(template, personas, userPersona?)` — optional appended user section
- `src/lib/ai.ts`: `sendToPersonas(excerpt, personas, settings, userPersona?)` — plumbed from reader-view via `getActiveUserPersonaId()`
- `src/components/reader/paginated-chapter.tsx` (new): multicol translateX engine
- `src/components/reader/comments-drawer.tsx` (new): book-wide comments browser
- `src/components/reader/user-persona-switcher.tsx` (new): popover list + create-on-the-fly
- `src/components/reader/reader-view.tsx`: swap scroll view for `PaginatedChapter`; track `pageIndex`; add comments drawer button + user persona chip; apply theme
- `src/components/reader/reader-settings.tsx`: add theme picker (`Select`)
- `src/components/reader/reader-topbar.tsx`: add comments icon button + user persona chip slot
- `src/components/profile/user-persona-section.tsx` (new): list/create/edit/switch
- `src/app/profile/page.tsx`: render `UserPersonaSection` above `SettingsForm`
- `DESIGN.md`: append "Reading themes (reader scoped)" subsection

---

## §2 Data model

```ts
// diff against src/lib/types.ts

+export type ReaderTheme = 'amber' | 'warmWhite';

 export interface ReaderPrefs {
   fontSize: number;
   fontFamily: string;
   lineSpacing: number;
+  theme: ReaderTheme;
 }

+export interface UserPersona {
+  id: string;
+  name: string;
+  personality: string;
+  createdAt: number;
+}

 export interface Book {
   ...
-  progress?: { chapterId: string; paragraphId: string };
+  progress?: { chapterId: string; paragraphId: string; pageIndex: number };
 }
```

Backward compat:
- `getPrefs()` spreads `DEFAULT_PREFS` (`theme: 'amber'`) before saved prefs, so existing users keep amber.
- `Book.progress.pageIndex` optional in practice — `getBook` callers treat missing as `0`.

---

## §3 Reading themes (reader-scoped)

Two named palettes applied as inline CSS vars on `#reader-content` only. App shell untouched, DESIGN.md "dark only" rule preserved.

| theme | `--reader-bg` | `--reader-text` | `--reader-muted` |
|---|---|---|---|
| `amber` (default, current) | `#26180A` | `#F0DCC0` | `#8A6038` |
| `warmWhite` | `#FAF4E8` | `#2A1F0E` | `#7A6448` |

Implementation:
- `reader-content` style: `backgroundColor: var(--reader-bg); color: var(--reader-text)`
- Paragraph text + h2 use `color: var(--reader-text)`; muted meta (chapter "N of M", prev/next) uses `var(--reader-muted)`
- `CommentPopover` and `SelectionToolbar` render outside the content container → unchanged colors
- `PaginatedChapter` reads `prefs.theme` → maps to the var object inline on `#reader-content`
- Theme chosen via `ReaderSettings` `Select` (amber / warm white). Saved in `ReaderPrefs.theme`

DESIGN.md addendum: a short subsection documenting the two palettes, the scoping rule (`#reader-content` override only), and that everything outside stays on the locked dark palette.

---

## §4 Page-flip (PaginatedChapter)

### Props

```ts
interface PaginatedChapterProps {
  paragraphs: Paragraph[];
  imageUrls: Map<string, string>;
  prefs: ReaderPrefs;
  pageIndex: number;
  pageCount: number;
  onPageCountChange: (n: number) => void;
  onFirstVisiblePid: (pid: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}
```

### Render

Single wrapped column-flow element translated horizontally by `pageIndex * pageWidth`:

```jsx
<div ref={viewportRef} style={{ overflow: 'hidden', height: pageHeight }}>
  <div ref={flowRef} style={{
    columnWidth: pageWidth,
    columnGap: GAP,
    columnFill: 'auto',
    height: pageHeight,
    transform: `translateX(${-pageIndex * pageWidth}px)`,
    transition: 'transform 250ms ease-out',
  }}>
    {paragraphs.map(p => <ParagraphBlock p={p} imageUrls={imageUrls} />)}
  </div>
</div>
```

### Reflow step (`reflow()`)

Triggered on: chapter load (rAF), viewport resize (debounced 250ms), font/lineSpacing/theme change (debounced 250ms).

Steps:
1. `pageWidth = viewport.clientWidth + GAP`
2. `pageCount = Math.ceil(flowRef.scrollWidth / pageWidth)` (min 1)
3. Notify parent via `onPageCountChange(pageCount)`
4. Clamp `pageIndex` to `[0, pageCount - 1]`

### Navigation

- Next/Prev buttons (top inline + bottom footer; current buttons become page flippers)
- Keyboard: ArrowLeft / ArrowRight
- Touch: pointerdown → pointermove → pointerup; horizontal delta > 40px flips; vertical ignored
- Clamp at ends (buttons disable at first/last)

### Cross-page selection

Columns stay in DOM (only transform moves), so native `Selection` spans pages. Resolve logic:
- Existing `resolveSelection(range, container)` reused unchanged — it reads `data-pid` from anchors regardless of visual position
- Toolbar position adjustment: `toolbarPos.x += pageIndex * pageWidth` (range rect is relative to untranslated flow). Clamp within viewport width.
- `overLimitNotifiedRef` 2000-word check unchanged.

### Progress / restore

Save (debounced 800ms after page stable):
- First visible pid on current page = first `[data-pid]` whose left edge is within `[pageIndex * pageWidth, (pageIndex + 1) * pageWidth)`
- `saveProgress(bookId, chapterId, paragraphId, pageIndex)`

Restore on chapter load:
- If `progress.paragraphId` → find column containing `[data-pid="..."]`, compute columnIndex from its offsetLeft, set pageIndex
- Else fall to `progress.pageIndex ?? 0`

### Images

`img` inside `ParagraphBlock` gets `maxHeight: pageHeight * 0.75` so each image fits one page. Images wider than column wrap naturally (CSS auto).

### CommentPopover

`CommentPopover` per paragraph attaches inside flow as before — still visible when current page shows that paragraph. Threads lookup unchanged.

---

## §5 Comments drawer

New file `comments-drawer.tsx`. Drawer primitive pattern copied from `bookmarks-panel.tsx`.

### Content

- `listThreads(book.id)` grouped by `chapterId`, sorted desc by `createdAt` within each group
- Group header: chapter title (from `book.toc`)
- Each thread row:
  - commenter avatars (stack if >1)
  - `selectedText` excerpt (first ~80 chars)
  - first comment text + "N more" badge if `comments.length > 1`
  - relative timestamp
- Tap row → `jumpTo(chapterId, paragraphId)` (same contract as bookmarks). `jumpTo` extended in reader-view to also restore `pageIndex` from paragraphId via same lookup logic as progress restore.
- Filter chips at top: "All" + one per persona that has comments in this book. Filters the list.

### Topbar

New icon button: `MessagesSquare` (lucide). Opens drawer via `onComments` callback in `ReaderTopbar`.

---

## §6 User persona (storage + UI)

### Storage (`src/lib/storage/user-personas.ts`)

Clone of `personas.ts` pattern but:
- No avatar field
- `K.userPersonas = 'arc:userPersonas'`
- `K.activeUserPersona = 'arc:activeUserPersona'` (stores persona id or null)
- CRUD: `listUserPersonas, getUserPersona, saveUserPersona, deleteUserPersona`
- `getActiveUserPersonaId(): string | null`
- `setActiveUserPersonaId(id: string | null): void`

`UserPersona` type stored separately from companion `Persona` (different shape, no avatar field). No shared table.

### Profile section (`user-persona-section.tsx`)

Mounted above `SettingsForm` in `/profile`:
- Header "User persona"
- Active persona card (highlighted, shows name + personality excerpt) with "Clear active" ghost button
- List of other personas, tap = "Set active"
- "Add user persona" button → opens modal form (name input + personality textarea, save). No avatar upload.
- Edit / delete from each row's menu
- Typography / spacing follow DESIGN.md (Card pattern, `space-y-6`, `max-w-lg`)

### Reader topbar chip

Small pill in `ReaderTopbar`:
- If active: shows name. Tap → `UserPersonaSwitcher` popover.
- If none: ghost "Set persona" pill. Tap → same popover.
- Switcher (Popover): list personas (tap = switch + close), "Manage" link → pushes `/profile`.

---

## §7 System prompt change

`src/lib/prompts.ts`:

```ts
export function renderSystemPrompt(
  template: string,
  personas: Persona[],
  userPersona?: UserPersona,
): string {
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

`ai.ts`:

```ts
export async function sendToPersonas(
  excerpt: NumberedParagraph[],
  personas: Persona[],
  settings: Settings,
  userPersona?: UserPersona,
): Promise<AIComment[]> {
  const system = renderSystemPrompt(settings.systemPromptTemplate, personas, userPersona);
  // ...rest unchanged
}
```

Reader-side: `reader-view.tsx` reads `getActiveUserPersonaId()` + `getUserPersona(id)` → passes into `handleSend` → `sendToPersonas(..., userPersona)`.

Backward compat:
- `DEFAULT_SYSTEM_PROMPT_TEMPLATE` unchanged (still uses `{{personas}}` only)
- Appended user block is unconditional when persona active, regardless of whether user has a custom `systemPromptTemplate` saved — no template migration needed
- No `{{userPersona}}` template token in v1 (keeps templates simple, avoids breaking existing saved prompts)

When no active user persona: render as before, prompt omits user section. AI behavior unchanged from today.

---

## §8 Implementation order

Each step ends with `npm run typecheck`, lint, and `next build` per AGENTS.md.

1. **Types + storage foundation**
   - Add `ReaderTheme`, `UserPersona`, theme in `ReaderPrefs`, `pageIndex` in `Book.progress`
   - Create `user-personas.ts` CRUD + active-id helpers
   - Update `keys.ts`
   - No UI changes — pure additive, nothing breaks

2. **Prompts + AI plumbing**
   - Update `renderSystemPrompt` signature
   - Update `sendToPersonas` signature
   - Typecheck (call sites in reader-view get updated in step 4)

3. **PaginatedChapter component**
   - New file `paginated-chapter.tsx`
   - Multicol + translateX reflow engine
   - Navigation (buttons, keyboard, swipe)
   - Selection toolbar position adjustment
   - Progress save/restore via first-visible-pid
   - This is the highest-risk piece; test against long chapter, short chapter, resize, font change, themed reader

4. **Reader-view integration**
   - Replace scroll view with `PaginatedChapter`
   - Wire `pageIndex`, `pageCount` state
   - Apply theme inline on `#reader-content`
   - Compute active user persona on `handleSend`
   - Add comments drawer open state + button handler
   - Add user persona chip in topbar props

5. **Reader-settings theme picker**
   - Add `Select` for `theme` (amber / warm white)
   - Persist via existing `savePrefs`

6. **Comments drawer**
   - New file `comments-drawer.tsx`
   - Group by chapter, filter by persona
   - Wire to topbar icon + jumpTo

7. **Profile user-persona section + reader switcher**
   - New `user-persona-section.tsx` (list/create/edit/switch/clear)
   - New `user-persona-switcher.tsx` (popover in reader topbar)
   - Insert section above `SettingsForm` in `/profile`

8. **DESIGN.md doc update**
   - Append "Reading themes (reader scoped)" subsection
   - Document two palettes (amber + warm white), scoping rule, DESIGN.md unchanged dark-only rule for shell

---

## Testing approach

Project uses `vitest` (`vitest.config.ts` present). Strategy:

- **Unit (vitest):**
  - `renderSystemPrompt` with and without `userPersona`
  - `sendToPersonas` calls (mock `callChat`)
  - `user-personas` storage CRUD round-trip (mock localStorage)
  - `getPrefs` backward-compat (saved prefs without `theme` → amber)
- **Manual / behavior verification:**
  - PaginatedChapter is DOM-geometry heavy; verify in browser:
    - long / short chapter reflow
    - resize while reading
    - font-size / line-spacing / theme change reflow
    - cross-page selection + toolbar position
    - progress save on page flip, restore on reopen
    - swipes, keyboard arrows, buttons
  - Comments drawer: jump-to-page after comment selection
  - Profile: create / edit / switch / clear user persona; reader topbar chip reflects active
  - System prompt: network tab inspection (or unit via `renderSystemPrompt`) confirms user section appended / omitted

Typecheck + lint + `next build` after every step, per AGENTS.md.

---

## Out of scope (YAGNI)

- Yellow theme (dropped per approval)
- User-persona avatar / profile pic (explicitly not needed per brief)
- `{{userPersona}}` template token for custom prompts (defer to v2)
- Reading history / cross-book comments aggregator
- Export / import of comments
- Server-side persona sync (project is local-only)

---

## Open questions resolved during brainstorming

- Scope: one combined spec + one plan (approved)
- Themes: reader-scoped override only, amber + warm white (approved after dropping yellow)
- Page-flip: paginated slide via column-flow + translateX (approved)
- Reflow handling: JS measure + column flow (approved)
- Selection on pages: cross-page via native Selection (approved)
- Comments browser: reader topbar drawer (approved)
- User persona fields: name + personality only (approved)
- Switch placement: profile + reader topbar chip (approved)
- No persona behavior: omit user section from prompt entirely (approved)