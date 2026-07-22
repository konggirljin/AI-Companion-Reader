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

- [ ] **Step 7: Run tests to verify they pass**
Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 8: Typecheck + lint + build**
Run: `npx tsc --noEmit`, `npm run lint`, `npx next build`
Expected: all clean.

- [ ] **Step 9: Commit**
```bash
git add src/lib/types.ts src/lib/storage/keys.ts src/lib/storage/settings.ts src/lib/storage/books.ts src/lib/storage/user-personas.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: reader UX foundation - ReaderTheme, UserPersona, storage, progress pageIndex"
```
