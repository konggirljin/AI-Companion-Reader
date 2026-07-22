# API Profiles (Preset Switch) + Fetch Available Models

## Context
Add two features to settings-form.tsx:
1. **API Profiles** — save/load/delete named API connection presets (base URL, API key, model)
2. **Fetch Available Models** — button to fetch models from the API and switch between them via dropdown

## Files to Modify

| File | Action |
|------|--------|
| `src/lib/types.ts` | Add `ApiProfile` interface |
| `src/lib/storage/keys.ts` | Add `apiProfiles` and `activeApiProfile` keys |
| `src/lib/storage/api-profiles.ts` | **New file** — CRUD for profiles + active profile tracking |
| `src/components/settings/settings-form.tsx` | Add profile switcher UI + fetch models feature |

## Implementation

### Step 1: Add `ApiProfile` type to `src/lib/types.ts`
Append after `UserPersona`:
```ts
export interface ApiProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  createdAt: number;
}
```

### Step 2: Add storage keys to `src/lib/storage/keys.ts`
Add to `K` object:
```ts
apiProfiles: 'arc:apiProfiles',
activeApiProfile: 'arc:activeApiProfile',
```

### Step 3: Create `src/lib/storage/api-profiles.ts`
New file mirroring the `user-personas.ts` pattern with:
- `listApiProfiles()` — read from storage
- `saveApiProfile()` — create or update
- `deleteApiProfile()` — remove + clear active if deleted
- `getActiveApiProfileId()` / `setActiveApiProfileId()` — active profile tracking

### Step 4: Modify `src/components/settings/settings-form.tsx`

**New imports:**
- `useEffect, useRef` from react
- `Plus, Save, Trash2, Layers, RefreshCw` from lucide-react
- `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from ui/select
- `Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle` from ui/dialog
- Profile CRUD functions from `@/lib/storage/api-profiles`
- `ApiProfile` type

**New state:**
- `profiles` — list of ApiProfile[]
- `activeProfileId` — currently active profile ID
- `saveDialogOpen` / `profileName` — dialog state
- `models` — fetched model list
- `fetchingModels` / `useCustomModel` — fetch state

**Profile features:**
- `useEffect` loads profiles on mount, applies active profile if exists
- `selectProfile(id)` — loads profile values into form
- `saveAsProfile()` — saves current form values as new profile
- `removeProfile(id)` — deletes profile
- UI: Select dropdown + "Save as profile" button above the Card
- Tags showing saved profiles with delete buttons below the select

**Fetch models feature:**
- `fetchModels()` — calls `${baseUrl}/models` (via proxy if set), parses response
- Replaces the model `<Input>` with a `<Select>` when models are loaded
- Falls back to text input via "+ Custom model..." option
- Fetch button with `RefreshCw` icon, spins while loading

**Profile UI placement:** Above the `<Card>` component, before the existing form

**Dialog placement:** After the `</Card>` closing tag

## Verification
- `npx tsc --noEmit` — clean
- `npm run lint` — clean  
- `npx next build` — clean
- `npm test` — all passing
