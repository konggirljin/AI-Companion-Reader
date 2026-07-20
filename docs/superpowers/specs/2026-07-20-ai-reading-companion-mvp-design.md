# AI Reading Companion — MVP Design Spec

**Date:** 2026-07-20
**Status:** Approved by user (with amendments incorporated)

## 1. Product Summary

A mobile-first PWA where users read EPUB/TXT books alongside customizable AI personas. The user selects a passage with native text selection, sends it to up to 5 chosen personas, and receives persona-consistent comments displayed as 晋江段评-style bubbles anchored at the end of the commented paragraphs. All data stays on-device; users supply their own OpenAI-compatible API credentials.

**This is NOT a document analysis tool.** Commentary reflects character personality, not objective analysis. Personas are selective — they comment only on what catches their attention, like a real reading companion.

## 2. Decisions Log (from brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Text selection model | Native text selection + floating toolbar | Avoids mis-taps; enables future highlights/quotes/underline |
| Commentary display | Paragraph-end reaction bubbles (段评-style) | Core differentiator; achievable in 2 weeks with paragraph-level anchoring |
| Comment anchoring | Paragraph level (stable paragraph IDs) | Sub-paragraph text offsets skipped for MVP |
| Multi-persona | Single API call, all personas in one prompt, JSON output | Cheaper; enables book-club feel; not technically difficult |
| Persona language | Per-persona language field | User choice; template includes it |
| System prompt | Editable global template in Settings, default provided | User wants to tweak it in-app |
| EPUB handling | Custom in-browser parser (JSZip + DOMParser), React rendering | Full control over anchoring/bubbles/theming; epub.js iframe rejected |
| Server usage | None — static export, client-side API calls | Keeps Capacitor/TWA Android path open; key stays on device |
| App UI language | English (single language for MVP) | Commentary language is per-persona |

## 3. Architecture

- **Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (new-york), Lucide icons, next-themes
- **Rendering:** 100% client components; `output: 'export'` static build. No API routes, no SSR data dependencies. Deployable to Vercel; wrappable via Capacitor/TWA for Android later.
- **AI calls:** Browser → `POST {baseUrl}/chat/completions` directly. User's API key stored in localStorage, sent only to their configured endpoint.
- **Storage:**
  - **localStorage** — settings, personas (avatar as base64 ≤256px), comment threads, bookmarks, reading progress, bookshelf metadata/order
  - **IndexedDB** — original EPUB/TXT files, parsed chapter content, cover blobs (localStorage quota too small for books)

## 4. Data Model

```ts
Book:      { id: string, title: string, author: string, format: 'epub' | 'txt',
             coverRef?: string, toc: TocEntry[], addedAt: number, order: number,
             progress?: { chapterId: string, paragraphId: string } }

TocEntry:  { title: string, chapterId: string, level: number }   // from EPUB nav/NCX or TXT chapter regex

Chapter:   { id: string, bookId: string, title: string,
             paragraphs: Paragraph[] }                              // stored in IndexedDB

Paragraph: { id: string,   // stable: `${chapterIndex}:${paragraphIndex}`
             text: string, tag: 'p' | 'h1'..'h6' | 'blockquote',
             images?: { src: string /* blob URL */, alt?: string }[] }

Persona:   { id: string, name: string, avatar: string /* base64, resized ≤256px */,
             characterDescription: string, language: string /* e.g. '中文', 'English' */,
             createdAt: number }

Thread:    { id: string, bookId: string, chapterId: string, paragraphId: string,
             selectedText: string /* excerpt snapshot */,
             comments: { personaId: string, text: string }[], createdAt: number }

Bookmark:  { id: string, bookId: string, chapterId: string, paragraphId: string, createdAt: number }

Settings:  { baseUrl: string, apiKey: string, model: string,
             systemPromptTemplate: string /* contains {{personas}} placeholder */ }

ReaderPrefs: { fontSize: number, fontFamily: string, lineSpacing: number }  // persisted globally
```

## 5. Import Pipeline (`lib/epub.ts`, `lib/txt.ts`)

### EPUB
1. JSZip unzips in browser → `META-INF/container.xml` → OPF path
2. Parse OPF: metadata (title, author), manifest, spine
3. **TOC extraction (automatic, like normal reader apps):** parse EPUB3 `nav.xhtml` if present, else EPUB2 `toc.ncx` → nested `TocEntry[]` mapped to spine chapters; fallback to spine order with filename-derived titles
4. Per spine item: XHTML → DOMParser → walk body block elements (`p`, `h1`–`h6`, `blockquote`) → `Paragraph[]` with stable IDs `${chapterIndex}:${paragraphIndex}`
5. Sanitize: strip `script`/`style`/event handlers; `<img src>` resolved against the zip → blob URLs (best-effort images)
6. Cover: OPF cover meta or first image → blob stored in IndexedDB

### TXT
1. Read as text (UTF-8, with GBK fallback via TextDecoder if decode fails/garbles)
2. Chapter split: regexes for `第…章` / `Chapter N` / `CHAPTER N` headings; fallback → single chapter or fixed-size chunks (~10k chars)
3. Paragraphs split on non-empty lines; same Paragraph model as EPUB

### Errors
Corrupt/DRM EPUB → toast "Couldn't import this file"; quota exceeded → toast with explanation. Failed imports never leave partial entries.

## 6. Reader (`/read/[id]`)

- **Layout:** continuous vertical scroll within a chapter (no pagination — anchor-friendly); prev/next chapter buttons; chapters lazy-rendered
- **Controls (persisted ReaderPrefs):** font size, font family, **line spacing**, light/dark via next-themes
- **TOC drawer:** auto-extracted TOC (§5), tap to jump to chapter
- **Bookmarks:** bookmark current position; bookmark list per book; tap to jump to paragraph
- **Progress:** restore last `{chapterId, paragraphId}` on open; shown on bookshelf cards

### Selection → Send flow
1. User makes a native text selection inside the reader
2. `selectionchange` → non-empty selection within reader container → floating toolbar near selection: **"Send to AI"** (plus persona picker, max 5)
3. On send: resolve `Range` → spanned paragraph IDs → build numbered excerpt (`[0] para text…`)
4. Excerpt + persona profiles → AI (§7) → comments with paragraph indices
5. **Bubble display:** a small comment icon appears at the end of each anchored paragraph; while waiting, a subtle "companion is reading…" indicator shows at anchor positions
6. Tap bubble → popover: persona avatar + name + comment text; multiple personas stacked in one popover; multiple threads on one paragraph merge into one bubble
7. Threads persist per book (localStorage); deleting a book deletes its threads

## 7. AI Integration (`lib/ai.ts`)

- Single `POST {baseUrl}/chat/completions` per send (OpenAI-compatible)
- Messages: `system` = rendered template from Settings; `user` = persona profiles (name, character description, language) + numbered paragraphs + task instruction
- **Max 5 personas per request** (prompt size + UX)
- Expected JSON output:
  ```json
  { "comments": [ { "persona_id": "p1", "paragraph_index": 0, "text": "…" } ] }
  ```
- Parsing: strip code fences, `JSON.parse`; on failure → one automatic retry appending "Return valid JSON only."
- **Default system prompt template** (editable in Settings, `{{personas}}` placeholder) enforces:
  - Stay in character per persona profile; never break the fourth wall
  - **Be selective:** comment only on paragraphs that genuinely catch that persona's attention; skipping most paragraphs is expected and good
  - Match each persona's language
  - Comments are conversational reactions (feelings, jokes, observations), not analysis summaries — unless analysis suits the persona
  - Output JSON only, in the exact schema
- **Errors:** 429 → exponential backoff (2 retries) + toast; network/timeout (60s AbortController) → toast with retry; malformed JSON after retry → toast "companion got distracted, try again"
- Settings not configured → send action routes user to `/settings` with a notice

## 8. Screens

| Route | Contents |
|---|---|
| `/` | **Bookshelf:** cover grid (cover, title, progress), Import button (EPUB/TXT), per-book menu: rename, delete; drag to reorder |
| `/read/[id]` | Reader: scroll content, selection toolbar, comment bubbles, TOC drawer, bookmarks, font/size/spacing controls |
| `/persona` | Persona list (avatar, name, description preview), edit/delete |
| `/persona/create` + `/persona/[id]/edit` | Form: name, avatar upload (crop/resize ≤256px base64), character description (free text), language (dropdown: 中文 / English / 日本語 + custom) |
| `/settings` | Base URL, API key (password input), model name, **system prompt template editor** (textarea with reset-to-default) |

Navigation: simple top header per DESIGN.md (logo, theme toggle); mobile-first, reading content `max-w-2xl` centered.

## 9. PWA

`manifest.json` (name, icons, standalone display), service worker for the app shell (offline open; books/personas already local). Installable on Android/iOS browsers. PWA + static export keep both Play Store paths open: TWA (Bubblewrap) or Capacitor wrap.

## 10. Error Handling Summary

| Case | Behavior |
|---|---|
| Import failure (corrupt/DRM) | Toast, no partial data |
| Storage quota exceeded | Toast explaining space issue |
| API 429 | Backoff ×2, then toast |
| Network/timeout (60s) | Toast + retry button in panel |
| Malformed JSON | 1 auto-retry → toast |
| Missing API settings | Redirect to /settings with notice |
| Selection spans >2000 words | Toast "select a shorter passage" (cost guard) |

## 11. Testing

Per AGENTS.md: manual testing (no test framework). Sample EPUB (with nav TOC + images), sample EPUB2 (NCX), sample TXT (Chinese chapters), your own OpenAI-compatible key. Mobile checks via devtools device mode + real phone over LAN (`next dev` / LAN URL of Vercel preview). Verify: import → TOC correct → read → select → send (1 and 5 personas) → bubbles anchor correctly → persistence across reload → PWA install.

## 12. Build Order (14 days)

1. **d1–2:** Scaffold (Next.js 14, TS, Tailwind, shadcn/ui, next-themes, PWA) + storage layer (localStorage helpers, IndexedDB wrapper)
2. **d2–4:** EPUB/TXT import pipeline + bookshelf (import, rename, delete, reorder)
3. **d4–6:** Reader (scroll, TOC drawer, bookmarks, progress, font size/family/**line spacing** controls)
4. **d6–7:** Personas (list/create/edit, avatar processing)
5. **d7–10:** AI integration + selection toolbar + comment bubbles/popover
6. **d10–14:** PWA finishing, error states, mobile polish, end-to-end demo rehearsal

## 13. Out of Scope (YAGNI)

User accounts, cloud sync, social features, payments, auto-generated comments (no user selection), sub-paragraph highlight anchors, comment frequency/length controls, per-persona system prompt overrides, highlights/underline/quotes (selection model is future-compatible), >5 personas per request.
