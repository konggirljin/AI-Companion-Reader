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

