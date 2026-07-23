# Design System - AI Reading Companion

## Stack

- **Framework:** Next.js (App Router) + React + TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (new-york style)
- **Icons:** Lucide React
- **Fonts:** Nunito (400-800, via next/font/google)
- **Dark mode:** Dark only (locked, no theme toggle)
- **Utilities:** `cn()` from `@/lib/utils`

---

## Colors

### Palette (dark only, locked)

| Token | HEX | Usage |
|---|---|---|
| `background` | `#1C0F07` | App shell, shelf wall |
| `foreground` | `#F0DCC0` | Cream primary text |
| `card` | `#26180A` | Elevated dark wood surfaces |
| `card-foreground` | `#F0DCC0` | Text on card |
| `primary` | `#C89060` | Amber accent (icons, links, focus) |
| `primary-foreground` | `#1C0F07` | Text on amber |
| `secondary` | `#3D2010` | Active nav pill bg |
| `secondary-foreground` | `#E8B870` | Active nav icon/label |
| `muted` | `#3D2010` | Subdued surfaces |
| `muted-foreground` | `#8A6038` | Muted caramel secondary text |
| `accent` | `#9A6535` | Active filter pill bg |
| `accent-foreground` | `#F5ECD8` | Active filter pill text |
| `destructive` | warm red | Error states |
| `border` | warm 28/35/20 | Borders, inputs |
| `ring` | `#C89060` | Focus ring |

**Shelf plank gradient:**
```
linear-gradient(to bottom, #9A5A28 0%, #7A4020 35%, #8C5028 65%, #632E14 100%)
```

**Shelf wall:** `#1C0F07` with faint vertical texture stripes.
**Outer desktop canvas:** `#0A0603`.

---

## Typography

### Font Families

| Token | Font | Usage |
|---|---|---|
| `--font-nunito` | Nunito (400-800) | All UI text |

### Type Scale

| Class | Size | Usage |
|---|---|---|
| `text-xs` | 12px | Timestamps, helper text |
| `text-sm` | 14px | Labels, descriptions |
| `text-base` | 16px | Base text (mobile) |
| `text-lg` | 18px | Dialog titles |
| `text-xl` | 20px | Section titles |
| `text-2xl` | 24px | Page titles |
| `text-3xl` | 30px | Dashboard headings |

### Font Weights

| Class | Weight | Usage |
|---|---|---|
| `font-medium` | 500 | Buttons, labels |
| `font-semibold` | 600 | Card titles, headings |
| `font-bold` | 700 | Page titles |

---

## Spacing

### Container

```
container mx-auto px-4
```

### Max Widths

| Class | Value | Usage |
|---|---|---|
| `max-w-sm` | 24rem | Auth forms |
| `max-w-md` | 28rem | Login cards |
| `max-w-lg` | 32rem | Dialogs |
| `max-w-2xl` | 42rem | Large dialogs |
| `max-w-3xl` | 48rem | Embeds |
| `max-w-4xl` | 56rem | Main content |

### Vertical Spacing

| Class | Usage |
|---|---|
| `space-y-1` | Tight lists |
| `space-y-2` | Form groups |
| `space-y-4` | Form sections |
| `space-y-6` | Card sections |
| `space-y-8` | Page sections |

### Padding

| Class | Usage |
|---|---|
| `p-2` | Code blocks |
| `p-3` | Chat bubbles |
| `p-4` | Grid items |
| `p-6` | Cards, dialogs |

---

## Border Radius

| Token | Value | Class |
|---|---|---|
| `--radius` | `0.625rem` (10px) | Base |
| `--radius-sm` | 6px | `rounded-sm` |
| `--radius-md` | 8px | `rounded-md` |
| `--radius-lg` | 10px | `rounded-lg` |
| `--radius-xl` | 14px | `rounded-xl` |

**Usage:**
- `rounded-md` — Buttons, inputs
- `rounded-lg` — Cards, dialogs
- `rounded-full` — Badges, avatars

---

## Shadows

| Class | Usage |
|---|---|
| `shadow-xs` | Inputs |
| `shadow-sm` | Card base |
| `shadow-md` | Card hover |
| `shadow-lg` | Dialogs |

---

## Animations

### Custom Keyframes

| Name | Effect | Duration |
|---|---|---|
| `fade-in` | Opacity 0 → 1 | 0.3s |
| `fade-up` | Opacity + translateY | 0.4s |
| `scale-in` | Opacity + scale | 0.2s |

Use via: `animate-fade-in`, `animate-fade-up`, `animate-scale-in`

### Transitions

| Class | Usage |
|---|---|
| `transition-colors` | Links, hover |
| `transition-all duration-200` | Card hover |

---

## Layout

### Root Structure

```
<body class="antialiased min-h-[100dvh] flex flex-col bg-background">
  <main class="flex-1">{children}</main>
  <BottomNav />   (hidden on /read)
</body>
```

### Page Patterns

**Auth pages:**
```
flex min-h-[calc(100vh-4rem)] items-center justify-center p-4
  → Card w-full max-w-md
```

**Content pages:**
```
container mx-auto px-4 py-8
  → max-w-4xl mx-auto
```

### Grid Patterns

| Pattern | Usage |
|---|---|
| `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` | Feature cards |
| `grid grid-cols-1 md:grid-cols-2 gap-6` | Dashboard |
| `grid grid-cols-1 md:grid-cols-3 gap-4` | Quick actions |

### Responsive Breakpoints

- `sm:` (640px) — Padding, text
- `md:` (768px) — Grid columns
- `lg:` (1024px) — Wide layouts

---

## Icons

**Library:** Lucide React

### Sizing

| Size | Classes | Usage |
|---|---|---|
| XS | `h-3 w-3` | Badge icons |
| SM | `h-3.5 w-3.5` | Copy buttons |
| Default | `h-4 w-4` | Standard UI |
| MD | `h-5 w-5` | Header logo |
| LG | `h-7 w-7` | Hero logo |

---

## Components (shadcn/ui)

All components in `src/components/ui/`. Use `cn()` for class merging.

### Button

| Variant | Usage |
|---|---|
| `default` | Primary actions |
| `secondary` | Secondary actions |
| `outline` | Tertiary actions |
| `ghost` | Subtle/icon actions |
| `destructive` | Delete actions |

| Size | Height |
|---|---|
| `sm` | h-8 |
| `default` | h-9 |
| `lg` | h-10 |
| `icon` | size-9 |

### Card

6 sub-components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

Base: `rounded-lg border bg-card text-card-foreground shadow-sm`

### Input / Textarea

- Height: `h-9` (input), `min-h-16` (textarea)
- Border: `border bg-transparent rounded-md shadow-xs`
- Focus: `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`

### Badge

4 variants: `default`, `secondary`, `destructive`, `outline`

Base: `rounded-full border px-2.5 py-0.5 text-xs font-semibold`

---

## Focus States

### Focus Ring

```css
outline-2 outline-offset-2 outline-ring/70
```

### Disabled

```
disabled:pointer-events-none disabled:opacity-50
```

### Interactive Card Hover

```
transition-all duration-200 ease-out
hover:shadow-md hover:-translate-y-0.5
```

---

## Dark Mode

- Dark only. No light mode, no system toggle.
- The warm palette is the single `:root` token set in globals.css.

---

## Branding

### Logo Text

```
bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent
```

### Logo Icon Container

```
w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center
```

---

## Reading Themes (reader scoped)

Two palettes override CSS variables **only inside `#reader-content`**. The app shell stays dark-only; this does not relax the dark-only rule for the rest of the app.

| theme | `--reader-bg` | `--reader-text` | `--reader-muted` |
|---|---|---|---|
| `amber` (default) | `#26180A` | `#F0DCC0` | `#8A6038` |
| `warmWhite` | `#FAF4E8` | `#2A1F0E` | `#7A6448` |
| `sepia` | `#F5E8C4` | `#3D2B1F` | `#8B7355` |
| `green` | `#C8D8C8` | `#1E3A2E` | `#5A7A5E` |

- Applied inline on the reader content container (`readerContentStyle(theme)` in `src/lib/reader-themes.ts`).
- Stored in `ReaderPrefs.theme`. Default `amber` for backward continuity with the existing dark palette.
- Chosen via the "Reading theme" select in the reader settings dialog.
- Components rendered outside `#reader-content` (`SelectionToolbar`, `CommentPopover` anchor bubbles, topbar, drawers) keep the locked dark palette.
```
