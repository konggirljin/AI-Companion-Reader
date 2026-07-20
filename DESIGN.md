# Design System - AI Reading Companion

## Stack

- **Framework:** Next.js (App Router) + React + TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (new-york style)
- **Icons:** Lucide React
- **Fonts:** Geist (sans) + Geist Mono (mono)
- **Dark mode:** next-themes (class-based)
- **Utilities:** `cn()` from `@/lib/utils`

---

## Colors

### Primary Palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `background` | `oklch(1 0 0)` | `oklch(0.141 0.005 285.823)` | Page background |
| `foreground` | `oklch(0.141 0.005 285.823)` | `oklch(0.985 0 0)` | Primary text |
| `primary` | `oklch(0.21 0.034 270)` | `oklch(0.92 0.02 270)` | Buttons, links, accents |
| `primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.21 0.006 285.885)` | Text on primary |
| `secondary` | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` | Secondary buttons |
| `muted` | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` | Subdued backgrounds |
| `accent` | `oklch(0.96 0.012 270)` | `oklch(0.28 0.018 270)` | Hover backgrounds |
| `destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Error states |
| `border` | `oklch(0.92 0.004 286.32)` | `oklch(1 0 0 / 10%)` | Borders |

---

## Typography

### Font Families

| Token | Font | Usage |
|---|---|---|
| `--font-geist-sans` | Geist | All UI text |
| `--font-geist-mono` | Geist Mono | Code, monospace |

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
<body class="antialiased min-h-screen flex flex-col">
  <Header />
  <main class="flex-1">{children}</main>
  <Footer />
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

- **Method:** Class-based via `next-themes`
- **Default:** System preference
- **Toggle:** 3-way dropdown — Light / Dark / System

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
