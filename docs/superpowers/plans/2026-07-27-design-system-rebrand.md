# Design System Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply `docs/DESIGN_SYSTEM.md` across the whole app — global theme (Inter font, rosa/pink palette, working light/dark mode), a redesigned sidebar with a brand block, a real header (section indicator + theme toggle), colored category badges in Proveedores/Productos (matching what Gastos already has), a retrofit of Proveedores/Productos page headers and table containers, and a real Inicio dashboard (replacing the current `return null`).

**Architecture:** Theme is CSS variables (`globals.css`) + `next-themes`' `ThemeProvider` (already a dependency, currently unwired — no `<ThemeProvider>` exists anywhere yet) toggling a `.dark` class on `<html>`. Layout shell (`src/app/layout.tsx`) composes `AppSidebar` + a new `AppHeader`, both driven by a shared `NAV_ITEMS` list extracted to its own module so the sidebar and header never drift out of sync. Category colors for Proveedores/Productos reuse the exact `ColorToken`/`badgeColorClasses` machinery already built for Gastos — relocated from `src/types/gasto.ts` to its natural home, `src/lib/badgeColors.ts`, so a proveedores/productos type isn't importing from a gastos-specific file.

**Tech Stack:** Next.js App Router, `next-themes` (already installed, unwired), Tailwind v4 CSS variables, shadcn/ui (`Sidebar`'s `SidebarHeader` slot, `Button` — no new components needed), Lucide React icons.

## Global Constraints

- Theme toggle is 2-state only (light ↔ dark) — no 3-state light/dark/system selector UI. `ThemeProvider` still uses `defaultTheme="system"` + `enableSystem` so the *initial* resolved theme respects the OS preference; the toggle button itself always sets an explicit `'light'` or `'dark'` once clicked.
- Colors and font come verbatim from `docs/DESIGN_SYSTEM.md` §1 (Inter, weights 400/500/600/700) and §2 (`:root`/`.dark` CSS variables) — copy the exact values, don't invent new ones.
- Sidebar brand name: **"Gestión de Proveedores"** — used both in the sidebar brand block and as the `<title>` in `layout.tsx`'s metadata.
- `categorias.color` is a DB column (same pattern as `categorias_gasto.color`, already shipped) — it is never rendered as literal text/column in any UI table; it only selects a Tailwind class for a `Badge`.
- No UI component tests in this project (services/actions/pure-logic get tests, UI composition doesn't) — this plan follows that. Where a task modifies an *existing* tested service (`categoriasService`, `proveedoresService`), its existing test file is updated in the same task, not skipped.
- `DataTable`'s `className` prop (from the Gastos feature) already exists in `src/components/ui/data-table.tsx` — reuse it, don't modify `data-table.tsx` again.
- Gastos (`src/app/gastos/*`, `src/components/gastos/*`) is not touched except where explicitly noted (the `ColorToken` relocation touches `src/types/gasto.ts` and `src/components/gastos/columnas-gastos.tsx`'s import line only — no behavior change there).

---

### Task 1: Global theme — Inter font, ThemeProvider, color variables

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: a working `next-themes` context (any descendant can call `useTheme()` and get real values back — today `src/components/ui/sonner.tsx` already calls it but gets nothing since there's no provider) — consumed by Task 2's `ThemeToggle`.
- Produces: `--font-inter` CSS variable wired as `--font-sans` — no code consumes this directly, it's global.

This task does **not** touch the `<div className="p-2"><SidebarTrigger /></div>` placeholder in `layout.tsx` yet — Task 4 replaces it with `<AppHeader />` once `AppHeader` exists. Keeping it as-is here means this task is independently buildable.

- [ ] **Step 1: Replace the font and add ThemeProvider in `layout.tsx`**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestión de Proveedores",
  description: "Gestión interna de proveedores, productos y gastos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <div className="p-2">
                <SidebarTrigger />
              </div>
              {children}
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` is the standard `next-themes` pattern: the library sets the `.dark` class client-side before React hydrates (reading `localStorage`/system preference), which would otherwise produce a harmless-but-noisy hydration mismatch warning on that one element.

- [ ] **Step 2: Replace the color variables in `globals.css`**

Modify `src/app/globals.css` — change the `--font-sans` line inside `@theme inline`, and replace the entire `:root { ... }` and `.dark { ... }` blocks with the values from `docs/DESIGN_SYSTEM.md` §2 (exact, including the new `--radius: 0.5rem`):

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.145 0 0);

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  --primary: oklch(0.65 0.25 350);
  --primary-foreground: oklch(1 0 0);

  --secondary: oklch(0.96 0 0);
  --secondary-foreground: oklch(0.205 0 0);

  --muted: oklch(0.96 0 0);
  --muted-foreground: oklch(0.50 0 0);

  --accent: oklch(0.96 0 0);
  --accent-foreground: oklch(0.205 0 0);

  --destructive: oklch(0.577 0.245 27.325);

  --border: oklch(0.90 0 0);
  --input: oklch(0.90 0 0);
  --ring: oklch(0.65 0.25 350);

  --chart-1: oklch(0.65 0.25 350);
  --chart-2: oklch(0.70 0.18 55);
  --chart-3: oklch(0.72 0.15 185);
  --chart-4: oklch(0.68 0.20 300);
  --chart-5: oklch(0.78 0.15 85);

  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.40 0 0);
  --sidebar-primary: oklch(0.65 0.25 350);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.95 0.02 350);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.92 0 0);
  --sidebar-ring: oklch(0.65 0.25 350);

  --radius: 0.5rem;
}

.dark {
  --background: oklch(0.13 0 0);
  --foreground: oklch(0.93 0 0);

  --card: oklch(0.18 0 0);
  --card-foreground: oklch(0.93 0 0);
  --popover: oklch(0.18 0 0);
  --popover-foreground: oklch(0.93 0 0);

  --primary: oklch(0.72 0.22 350);
  --primary-foreground: oklch(0.13 0 0);

  --secondary: oklch(0.22 0 0);
  --secondary-foreground: oklch(0.93 0 0);

  --muted: oklch(0.22 0 0);
  --muted-foreground: oklch(0.63 0 0);

  --accent: oklch(0.22 0 0);
  --accent-foreground: oklch(0.93 0 0);

  --destructive: oklch(0.704 0.191 22.216);

  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.72 0.22 350);

  --chart-1: oklch(0.72 0.22 350);
  --chart-2: oklch(0.75 0.16 55);
  --chart-3: oklch(0.75 0.13 185);
  --chart-4: oklch(0.72 0.18 300);
  --chart-5: oklch(0.80 0.13 85);

  --sidebar: oklch(0.16 0 0);
  --sidebar-foreground: oklch(0.80 0 0);
  --sidebar-primary: oklch(0.72 0.22 350);
  --sidebar-primary-foreground: oklch(0.13 0 0);
  --sidebar-accent: oklch(0.22 0.02 350);
  --sidebar-accent-foreground: oklch(0.93 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.72 0.22 350);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 3: Verify the build**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run build
```

Expected: `✓ Compiled successfully`, same route list as before (`/`, `/gastos`, `/productos`, `/proveedores`).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: wire ThemeProvider and apply design system colors and font"
```

---

### Task 2: ThemeToggle component

**Files:**
- Create: `src/components/layout/theme-toggle.tsx`

**Interfaces:**
- Consumes: `useTheme` from `next-themes` (functional as of Task 1).
- Produces: `ThemeToggle` (no props) — consumed by Task 4's `AppHeader`.

No test — matches this project's UI-component convention. `next-themes`' `resolvedTheme` is `undefined` during SSR and the first client render (the real theme depends on `localStorage`/system preference, which isn't known until after mount) — the `mounted` guard below is the standard fix; without it there's a flash of the wrong icon and a hydration warning.

- [ ] **Step 1: Write `src/components/layout/theme-toggle.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled aria-label="Cambiar tema" />;
  }

  const esOscuro = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={() => setTheme(esOscuro ? 'light' : 'dark')}
    >
      {esOscuro ? <Sun /> : <Moon />}
    </Button>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx tsc --noEmit
git add src/components/layout/theme-toggle.tsx
git commit -m "feat: add ThemeToggle component"
```

Expected: `tsc` passes (nothing imports this file yet, so this only confirms it's syntactically/type-valid standalone).

---

### Task 3: Sidebar redesign — shared nav items, brand header, remove label

**Files:**
- Create: `src/components/layout/nav-items.ts`
- Modify: `src/components/layout/app-sidebar.tsx`

**Interfaces:**
- Produces: `NAV_ITEMS: NavItem[]` and `type NavItem = { href: string; label: string; icon: LucideIcon }` from `@/components/layout/nav-items` — consumed by Task 4's `AppHeader` (so the header's section label and the sidebar's active item always agree — one source of truth).

No test — UI composition. Verify with `npx tsc --noEmit`.

- [ ] **Step 1: Write `src/components/layout/nav-items.ts`**

```ts
import { Home, Package, Truck, Wallet, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/gastos', label: 'Gastos', icon: Wallet },
];
```

- [ ] **Step 2: Rewrite `src/components/layout/app-sidebar.tsx`**

Adds a brand block via the `SidebarHeader` slot (already exported by `src/components/ui/sidebar.tsx`, just not used yet), removes the `SidebarGroupLabel`, and reads `NAV_ITEMS` from the new shared module instead of a local array:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '@/components/layout/nav-items';

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Store className="size-4" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">Gestión de Proveedores</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx tsc --noEmit
git add src/components/layout/nav-items.ts src/components/layout/app-sidebar.tsx
git commit -m "feat: redesign sidebar with brand header, drop navigation label"
```

---

### Task 4: AppHeader — section indicator + theme toggle, wired into layout

**Files:**
- Create: `src/components/layout/app-header.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `NAV_ITEMS` from `@/components/layout/nav-items` (Task 3), `ThemeToggle` from `@/components/layout/theme-toggle` (Task 2), `SidebarTrigger` from `@/components/ui/sidebar`.
- Produces: `AppHeader` (no props) — consumed by `layout.tsx`.

No test — UI composition. Verify with `npm run build`.

- [ ] **Step 1: Write `src/components/layout/app-header.tsx`**

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NAV_ITEMS } from '@/components/layout/nav-items';

export function AppHeader() {
  const pathname = usePathname();
  const seccionActual = NAV_ITEMS.find((item) => item.href === pathname)?.label ?? '';

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="text-sm font-medium text-foreground">{seccionActual}</span>
      </div>
      <ThemeToggle />
    </header>
  );
}
```

- [ ] **Step 2: Wire it into `layout.tsx`**

Modify `src/app/layout.tsx` — replace the placeholder div, and its now-unneeded `SidebarTrigger` import, with `AppHeader`:

```tsx
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestión de Proveedores",
  description: "Gestión interna de proveedores, productos y gastos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              {children}
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the build**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run build
```

Expected: `✓ Compiled successfully`, same route list as before.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-header.tsx src/app/layout.tsx
git commit -m "feat: add AppHeader with section indicator and theme toggle"
```

---

### Task 5: `categorias` gets a `color` column (TDD update to `categoriasService`)

**Files:**
- Create: `supabase/migrations/20260727120000_categorias_color.sql`
- Modify: `src/lib/badgeColors.ts`
- Modify: `src/types/gasto.ts`
- Modify: `src/types/proveedor.ts`
- Modify: `src/lib/services/categoriasService.ts`
- Modify: `src/lib/services/categoriasService.test.ts`

**Interfaces:**
- Produces: `ColorToken` now lives in `@/lib/badgeColors` (moved from `@/types/gasto`) — consumed by Task 6's updated `columnas-proveedores.tsx`/`columnas-productos.tsx`, and internally by `@/types/gasto` and `@/types/proveedor`.
- Produces: `Categoria` (from `@/types/proveedor`) gains `color: ColorToken` — consumed by Task 6.
- Produces: `categoriasService.listar()` now returns `color` on every row — consumed by Task 6.

- [ ] **Step 1: Write the migration**

```sql
alter table public.categorias add column color text not null default 'slate';

update public.categorias set color = 'amber' where nombre = 'hogar';
update public.categorias set color = 'orange' where nombre = 'cocina';
update public.categorias set color = 'cyan' where nombre = 'limpieza';
update public.categorias set color = 'blue' where nombre = 'electrónica';
update public.categorias set color = 'indigo' where nombre = 'tecnología';
update public.categorias set color = 'fuchsia' where nombre = 'belleza';
update public.categorias set color = 'violet' where nombre = 'cuidado personal';
update public.categorias set color = 'emerald' where nombre = 'salud';
update public.categorias set color = 'slate' where nombre = 'bienestar';
update public.categorias set color = 'fuchsia' where nombre = 'arte';
update public.categorias set color = 'violet' where nombre = 'manualidades';
update public.categorias set color = 'orange' where nombre = 'mascotas';
```

The `default 'slate'` exists so any future insert that forgets to specify a color still gets a valid, renderable token rather than a null/constraint violation — it is not meant to be the intended value for anything except `bienestar`, which is why every category still gets an explicit `update` (including `bienestar`, for clarity — don't rely on the default silently matching the intended assignment).

- [ ] **Step 2: Apply the migration via the Supabase MCP tool**

Call `mcp__plugin_supabase_supabase__apply_migration` with `project_id: "vngsqjzlmqcpxlxtkbel"`, `name: "categorias_color"`, and the SQL from Step 1 as `query`.

- [ ] **Step 3: Verify the schema and data**

Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "vngsqjzlmqcpxlxtkbel"` and `select nombre, color from public.categorias order by nombre;`. Expected: all 12 rows (`hogar`, `cocina`, `limpieza`, `electrónica`, `tecnología`, `belleza`, `cuidado personal`, `salud`, `bienestar`, `arte`, `manualidades`, `mascotas`) each with the color from the table in Step 1 — no row left on the `'slate'` default except `bienestar`.

- [ ] **Step 4: Run the security advisor**

Call `mcp__plugin_supabase_supabase__get_advisors` with `project_id: "vngsqjzlmqcpxlxtkbel"`, `type: "security"`. Expected: no new ERROR/WARN findings (adding a column doesn't change RLS state).

- [ ] **Step 5: Commit the migration**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add supabase/migrations/20260727120000_categorias_color.sql
git commit -m "feat(db): add color column to categorias"
```

- [ ] **Step 6: Move `ColorToken` to `src/lib/badgeColors.ts`**

Modify `src/lib/badgeColors.ts` — remove the `import type { ColorToken } from '@/types/gasto';` line and define `ColorToken` locally instead (everything else in the file is unchanged):

```ts
export type ColorToken =
  | 'blue'
  | 'cyan'
  | 'amber'
  | 'violet'
  | 'orange'
  | 'emerald'
  | 'slate'
  | 'indigo'
  | 'fuchsia';

const BADGE_COLOR_CLASSES: Record<ColorToken, string> = {
  blue: 'border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  cyan: 'border-transparent bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  amber: 'border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  violet: 'border-transparent bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  orange: 'border-transparent bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  emerald: 'border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  slate: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  indigo: 'border-transparent bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  fuchsia: 'border-transparent bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
};

export function badgeColorClasses(token: ColorToken): string {
  return BADGE_COLOR_CLASSES[token];
}
```

- [ ] **Step 7: Update `src/types/gasto.ts` to import `ColorToken` instead of defining it**

Replace the local `export type ColorToken = ...` union at the top of `src/types/gasto.ts` with:

```ts
import type { ColorToken } from '@/lib/badgeColors';
```

Everything else in that file (`Persona`, `CategoriaGasto`, `Gasto`, `GastoInput`, `CampoFechaGasto`, `FiltrosGasto`) stays exactly as it is — `CategoriaGasto.color: ColorToken` now resolves to the imported type.

- [ ] **Step 8: Fix the one consumer that imported `ColorToken` from `@/types/gasto`**

Modify `src/components/gastos/columnas-gastos.tsx` — its import line currently reads:

```ts
import type { CategoriaGasto, ColorToken, Gasto, Persona } from '@/types/gasto';
```

Change it to:

```ts
import type { ColorToken } from '@/lib/badgeColors';
import type { CategoriaGasto, Gasto, Persona } from '@/types/gasto';
```

No other line in that file changes.

- [ ] **Step 9: Add `color` to the `Categoria` type**

Modify `src/types/proveedor.ts` — add the import and the field:

```ts
import type { ColorToken } from '@/lib/badgeColors';

export type Categoria = {
  id: string;
  nombre: string;
  color: ColorToken;
};

export type Proveedor = {
  id: string;
  nombre: string;
  url: string;
  compraMinima: number | null;
  whatsapp: string | null;
  createdAt: string;
  categorias: Categoria[];
};

export type ProveedorInput = {
  nombre: string;
  url: string;
  compraMinima: number | null;
  whatsapp: string | null;
  categoriaIds: string[];
};
```

- [ ] **Step 10: Update the failing test for `categoriasService`**

Modify `src/lib/services/categoriasService.test.ts` to expect `color` in both the select call and the mocked/returned rows:

```ts
import { describe, it, expect, vi } from 'vitest';
import { categoriasService } from './categoriasService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

describe('categoriasService.listar', () => {
  it('devuelve las categorías ordenadas por nombre', async () => {
    const queryMock = createQueryMock({
      data: [
        { id: '1', nombre: 'cocina', color: 'orange' },
        { id: '2', nombre: 'hogar', color: 'amber' },
      ],
      error: null,
    });
    const from = vi.fn().mockReturnValue(queryMock);
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const result = await categoriasService.listar();

    expect(from).toHaveBeenCalledWith('categorias');
    expect(queryMock.select).toHaveBeenCalledWith('id, nombre, color');
    expect(queryMock.order).toHaveBeenCalledWith('nombre');
    expect(result).toEqual([
      { id: '1', nombre: 'cocina', color: 'orange' },
      { id: '2', nombre: 'hogar', color: 'amber' },
    ]);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    await expect(categoriasService.listar()).rejects.toThrow(
      'No se pudieron cargar las categorías: timeout'
    );
  });
});
```

- [ ] **Step 11: Run the test to verify it fails**

Run: `npm run test -- categoriasService`
Expected: FAIL — the first test's `expect(queryMock.select).toHaveBeenCalledWith('id, nombre, color')` doesn't match the current implementation's `'id, nombre'`.

- [ ] **Step 12: Update the implementation**

Modify `src/lib/services/categoriasService.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { Categoria } from '@/types/proveedor';

export const categoriasService = {
  async listar(): Promise<Categoria[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('categorias').select('id, nombre, color').order('nombre');

    throwOnSupabaseError(error, 'No se pudieron cargar las categorías');
    return data as Categoria[];
  },
};
```

- [ ] **Step 13: Run the test to verify it passes, then type-check**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run test -- categoriasService
npx tsc --noEmit
```

Expected: both tests pass; `tsc` passes (this step's `tsc` run also catches any other file that broke due to the `Categoria`/`ColorToken` type changes — if it doesn't, Task 6 handles the remaining consumers).

- [ ] **Step 14: Commit**

```bash
git add src/lib/badgeColors.ts src/types/gasto.ts src/types/proveedor.ts src/components/gastos/columnas-gastos.tsx src/lib/services/categoriasService.ts src/lib/services/categoriasService.test.ts
git commit -m "feat: add color to categorias and relocate ColorToken to badgeColors"
```

---

### Task 6: Colored badges in Proveedores and Productos

**Files:**
- Modify: `src/lib/services/proveedoresService.ts`
- Modify: `src/lib/services/proveedoresService.test.ts`
- Modify: `src/components/proveedores/columnas-proveedores.tsx`
- Modify: `src/components/productos/columnas-productos.tsx`

**Interfaces:**
- Consumes: `Categoria` with `color: ColorToken` (Task 5), `badgeColorClasses` from `@/lib/badgeColors` (Task 5).

`proveedoresService` embeds each proveedor's categories via a join (`proveedor_categorias ( categorias ( ... ) )`) — that join's column list needs `color` added, or every `categoria.color` read by the UI would be `undefined` at runtime despite the type now claiming it's always present. `productosService`/`productos` pages already fetch the full `Categoria[]` list separately via `categoriasService.listar()` and look categories up by id — they automatically get `color` for free once Task 5 lands, no service change needed there.

- [ ] **Step 1: Update the failing test for `proveedoresService`**

Modify `src/lib/services/proveedoresService.test.ts` — every inline `categorias`/`proveedor_categorias` object gains a `color` field (`hogar` → `'amber'`, `cocina` → `'orange'`, matching Task 5's migration):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proveedoresService } from './proveedoresService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

const mockedCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;

describe('proveedoresService', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  describe('listar', () => {
    it('devuelve los proveedores con sus categorías aplanadas', async () => {
      const queryMock = createQueryMock({
        data: [
          {
            id: 'p1',
            nombre: 'Mayorista Uno',
            url: 'https://mayorista-uno.com',
            compra_minima: 100,
            whatsapp: '5491122334455',
            created_at: '2026-07-22T00:00:00.000Z',
            proveedor_categorias: [
              { categorias: { id: 'c1', nombre: 'hogar', color: 'amber' } },
              { categorias: { id: 'c2', nombre: 'cocina', color: 'orange' } },
            ],
          },
        ],
        error: null,
      });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      const result = await proveedoresService.listar();

      expect(from).toHaveBeenCalledWith('proveedores');
      expect(queryMock.select).toHaveBeenCalledWith(expect.stringContaining('color'));
      expect(result).toEqual([
        {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compraMinima: 100,
          whatsapp: '5491122334455',
          createdAt: '2026-07-22T00:00:00.000Z',
          categorias: [
            { id: 'c1', nombre: 'hogar', color: 'amber' },
            { id: 'c2', nombre: 'cocina', color: 'orange' },
          ],
        },
      ]);
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(proveedoresService.listar()).rejects.toThrow(
        'No se pudieron cargar los proveedores: timeout'
      );
    });
  });

  describe('crear', () => {
    it('llama a la RPC crear_proveedor con los parámetros correctos y devuelve el registro completo', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: 'p1', error: null });
      const finalRead = createQueryMock({
        data: {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compra_minima: 100,
          whatsapp: '5491122334455',
          created_at: '2026-07-22T00:00:00.000Z',
          proveedor_categorias: [{ categorias: { id: 'c1', nombre: 'hogar', color: 'amber' } }],
        },
        error: null,
      });
      const from = vi.fn().mockReturnValue(finalRead);

      mockedCreateClient.mockReturnValue({ rpc, from });

      const result = await proveedoresService.crear({
        nombre: 'Mayorista Uno',
        url: 'https://mayorista-uno.com',
        compraMinima: 100,
        whatsapp: '5491122334455',
        categoriaIds: ['c1'],
      });

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('crear_proveedor', {
        p_nombre: 'Mayorista Uno',
        p_url: 'https://mayorista-uno.com',
        p_compra_minima: 100,
        p_whatsapp: '5491122334455',
        p_categoria_ids: ['c1'],
      });
      expect(from).toHaveBeenCalledWith('proveedores');
      expect(result.id).toBe('p1');
      expect(result.categorias).toEqual([{ id: 'c1', nombre: 'hogar', color: 'amber' }]);
    });

    it('lanza un error legible y no toca la tabla si la RPC falla (atomicidad: una sola llamada de red)', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'fk violation' } });
      const from = vi.fn();

      mockedCreateClient.mockReturnValue({ rpc, from });

      await expect(
        proveedoresService.crear({
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compraMinima: 100,
          whatsapp: '5491122334455',
          categoriaIds: ['c1'],
        })
      ).rejects.toThrow('No se pudo crear el proveedor: fk violation');

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('llama a la RPC actualizar_proveedor con los parámetros correctos y devuelve el registro completo', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const finalRead = createQueryMock({
        data: {
          id: 'p1',
          nombre: 'Mayorista Uno Actualizado',
          url: 'https://mayorista-uno.com',
          compra_minima: 150,
          whatsapp: '5491122334455',
          created_at: '2026-07-22T00:00:00.000Z',
          proveedor_categorias: [{ categorias: { id: 'c2', nombre: 'cocina', color: 'orange' } }],
        },
        error: null,
      });
      const from = vi.fn().mockReturnValue(finalRead);

      mockedCreateClient.mockReturnValue({ rpc, from });

      const result = await proveedoresService.actualizar('p1', {
        nombre: 'Mayorista Uno Actualizado',
        url: 'https://mayorista-uno.com',
        compraMinima: 150,
        whatsapp: '5491122334455',
        categoriaIds: ['c2'],
      });

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('actualizar_proveedor', {
        p_id: 'p1',
        p_nombre: 'Mayorista Uno Actualizado',
        p_url: 'https://mayorista-uno.com',
        p_compra_minima: 150,
        p_whatsapp: '5491122334455',
        p_categoria_ids: ['c2'],
      });
      expect(from).toHaveBeenCalledWith('proveedores');
      expect(result.nombre).toBe('Mayorista Uno Actualizado');
      expect(result.categorias).toEqual([{ id: 'c2', nombre: 'cocina', color: 'orange' }]);
    });

    it('lanza un error legible y no toca la tabla si la RPC falla (atomicidad: una sola llamada de red)', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'fk violation' } });
      const from = vi.fn();

      mockedCreateClient.mockReturnValue({ rpc, from });

      await expect(
        proveedoresService.actualizar('p1', {
          nombre: 'Mayorista Uno Actualizado',
          url: 'https://mayorista-uno.com',
          compraMinima: 150,
          whatsapp: '5491122334455',
          categoriaIds: ['c2'],
        })
      ).rejects.toThrow('No se pudo actualizar el proveedor: fk violation');

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina el proveedor por id', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 1 }));
      mockedCreateClient.mockReturnValue({ from });

      await proveedoresService.eliminar('p1');

      expect(from).toHaveBeenCalledWith('proveedores');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({ data: null, error: { message: 'fk violation' }, count: null })
      );
      mockedCreateClient.mockReturnValue({ from });

      await expect(proveedoresService.eliminar('p1')).rejects.toThrow(
        'No se pudo eliminar el proveedor: fk violation'
      );
    });

    it('lanza un error legible si el proveedor ya no existe', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 0 }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(proveedoresService.eliminar('p1')).rejects.toThrow(
        'El proveedor ya no existe (probablemente ya fue eliminado por otra persona).'
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- proveedoresService`
Expected: FAIL on `expect(queryMock.select).toHaveBeenCalledWith(expect.stringContaining('color'))` — the current `SELECT_CON_CATEGORIAS` doesn't request `color`, so the mock's recorded call to `.select(...)` doesn't contain that string yet. This is the assertion that actually drives the implementation change below (the mock returns whatever `data` you configure regardless of the select string, so without this specific assertion the rest of the test would pass even with a stale select list — this line is what makes the test genuinely red before the fix).

- [ ] **Step 3: Update the implementation**

Modify `src/lib/services/proveedoresService.ts` — change only the `SELECT_CON_CATEGORIAS` constant:

```ts
const SELECT_CON_CATEGORIAS = `
  id, nombre, url, compra_minima, whatsapp, created_at,
  proveedor_categorias ( categorias ( id, nombre, color ) )
`;
```

Nothing else in the file changes — `mapRow`'s `categorias: row.proveedor_categorias.map((pc) => pc.categorias)` already passes each `categorias` object through as-is, so it now carries `color` automatically.

- [ ] **Step 4: Run the test and type-check**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run test -- proveedoresService
npx tsc --noEmit
```

Expected: all `proveedoresService` tests pass; `tsc` passes with no errors anywhere in the project (this is the point where every remaining `Categoria`-typed consumer must already compile — if `columnas-proveedores.tsx`/`columnas-productos.tsx` aren't updated yet, they still compile fine since `Badge`'s existing `variant="secondary"` usage doesn't read `.color` at all; the type addition is additive, not breaking).

- [ ] **Step 5: Colorize the badges in `columnas-proveedores.tsx`**

Modify `src/components/proveedores/columnas-proveedores.tsx`:

```tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import { BotonEliminarProveedor } from '@/components/proveedores/boton-eliminar-proveedor';
import { badgeColorClasses } from '@/lib/badgeColors';
import { cn } from '@/lib/utils';
import type { Categoria, Proveedor } from '@/types/proveedor';

export function crearColumnas(categorias: Categoria[]): ColumnDef<Proveedor>[] {
  return [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'url',
      header: 'URL',
      cell: ({ row }) => (
        <a href={row.original.url} target="_blank" rel="noreferrer" className="underline">
          {row.original.url}
        </a>
      ),
    },
    { accessorKey: 'compraMinima', header: 'Compra mínima' },
    {
      accessorKey: 'whatsapp',
      header: 'WhatsApp',
      cell: ({ row }) =>
        row.original.whatsapp ? (
          <a
            href={`https://wa.me/${row.original.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {row.original.whatsapp}
          </a>
        ) : null,
    },
    {
      id: 'categorias',
      header: 'Categorías',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.categorias.map((categoria) => (
            <Badge key={categoria.id} variant="outline" className={cn(badgeColorClasses(categoria.color))}>
              {categoria.nombre}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <FormularioProveedor
            categorias={categorias}
            proveedor={row.original}
            trigger={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
          <BotonEliminarProveedor proveedorId={row.original.id} proveedorNombre={row.original.nombre} />
        </div>
      ),
    },
  ];
}
```

- [ ] **Step 6: Colorize the badge in `columnas-productos.tsx`**

Modify `src/components/productos/columnas-productos.tsx`:

```tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import { BotonEliminarProducto } from '@/components/productos/boton-eliminar-producto';
import { badgeColorClasses } from '@/lib/badgeColors';
import { cn } from '@/lib/utils';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

type CrearColumnasParams = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function crearColumnas({ proveedores, categorias }: CrearColumnasParams): ColumnDef<Producto>[] {
  const proveedorPorId = new Map(proveedores.map((p) => [p.id, p.nombre]));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));

  return [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      id: 'proveedor',
      header: 'Proveedor',
      cell: ({ row }) => proveedorPorId.get(row.original.proveedorId) ?? '—',
    },
    {
      id: 'categoria',
      header: 'Categoría',
      cell: ({ row }) => {
        const categoria = row.original.categoriaId ? categoriaPorId.get(row.original.categoriaId) : undefined;
        if (!categoria) return null;
        return (
          <Badge variant="outline" className={cn(badgeColorClasses(categoria.color))}>
            {categoria.nombre}
          </Badge>
        );
      },
    },
    { accessorKey: 'precioMenor', header: 'Precio menor' },
    { accessorKey: 'precioMayor', header: 'Precio mayor' },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <FormularioProducto
            proveedores={proveedores}
            categorias={categorias}
            producto={row.original}
            trigger={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
          <BotonEliminarProducto productoId={row.original.id} productoNombre={row.original.nombre} />
        </div>
      ),
    },
  ];
}
```

Note `categoriaPorId` changed from `Map<string, string>` (id → nombre) to `Map<string, Categoria>` (id → full object), since the cell now needs both `nombre` and `color`.

- [ ] **Step 7: Type-check and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx tsc --noEmit
git add src/lib/services/proveedoresService.ts src/lib/services/proveedoresService.test.ts src/components/proveedores/columnas-proveedores.tsx src/components/productos/columnas-productos.tsx
git commit -m "feat: colorize category badges in proveedores and productos"
```

---

### Task 7: Retrofit Proveedores/Productos page headers and table containers

**Files:**
- Modify: `src/app/proveedores/page.tsx`
- Modify: `src/app/productos/page.tsx`
- Modify: `src/components/proveedores/tabla-proveedores.tsx`
- Modify: `src/components/productos/tabla-productos.tsx`

**Interfaces:**
- Consumes: `DataTable`'s existing `className` prop (already exists, from the Gastos feature — no changes to `data-table.tsx`).

No test — UI composition, matches `src/app/gastos/page.tsx`'s already-shipped pattern. Verify with `npm run build`.

- [ ] **Step 1: Retrofit `src/app/proveedores/page.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import { TablaProveedores } from '@/components/proveedores/tabla-proveedores';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { categoriasService } from '@/lib/services/categoriasService';

export default async function ProveedoresPage() {
  const [proveedores, categorias] = await Promise.all([
    proveedoresService.listar(),
    categoriasService.listar(),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná los proveedores mayoristas del catálogo.
          </p>
        </div>
        <FormularioProveedor categorias={categorias} trigger={<Button>Nuevo proveedor</Button>} />
      </div>
      <TablaProveedores proveedores={proveedores} categorias={categorias} />
    </main>
  );
}
```

- [ ] **Step 2: Retrofit `src/app/productos/page.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import { NuevoProductoDesdeFoto } from '@/components/productos/nuevo-producto-desde-foto';
import { TablaProductos } from '@/components/productos/tabla-productos';
import { productosService } from '@/lib/services/productosService';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { categoriasService } from '@/lib/services/categoriasService';

export default async function ProductosPage() {
  const [productos, proveedores, categorias] = await Promise.all([
    productosService.listar(),
    proveedoresService.listar(),
    categoriasService.listar(),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná el catálogo de productos y sus precios.
          </p>
        </div>
        <div className="flex gap-2">
          <NuevoProductoDesdeFoto proveedores={proveedores} categorias={categorias} />
          <FormularioProducto
            proveedores={proveedores}
            categorias={categorias}
            trigger={<Button>Nuevo producto</Button>}
          />
        </div>
      </div>
      <TablaProductos productos={productos} proveedores={proveedores} categorias={categorias} />
    </main>
  );
}
```

- [ ] **Step 3: Add the table container class in `tabla-proveedores.tsx`**

Modify `src/components/proveedores/tabla-proveedores.tsx` — add `className="rounded-lg border bg-card"` to the existing `<DataTable>` call (only that one prop is new):

```tsx
      <DataTable
        columns={columns}
        data={proveedores}
        emptyMessage="No hay proveedores cargados"
        onRowClick={setProveedorSeleccionado}
        className="rounded-lg border bg-card"
      />
```

- [ ] **Step 4: Add the table container class in `tabla-productos.tsx`**

Modify `src/components/productos/tabla-productos.tsx` — same one-prop addition:

```tsx
      <DataTable
        columns={columns}
        data={productos}
        emptyMessage="No hay productos cargados"
        onRowClick={setProductoSeleccionado}
        className="rounded-lg border bg-card"
      />
```

- [ ] **Step 5: Verify the build and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run build
git add src/app/proveedores/page.tsx src/app/productos/page.tsx src/components/proveedores/tabla-proveedores.tsx src/components/productos/tabla-productos.tsx
git commit -m "feat: retrofit proveedores and productos page headers and table containers"
```

---

### Task 8: Inicio dashboard (replaces the empty Home page)

**Files:**
- Create: `src/components/inicio/kpi-card.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `proveedoresService.listar()`, `productosService.listar()`, `gastosService.listar()` (all already exist, no changes).
- Produces: `KpiCard` (props: `label: string`, `value: string`) — used only by `page.tsx` in this plan, but generic enough for future dashboard cards.

No test — UI composition. Verify with `npm run build`.

- [ ] **Step 1: Write `src/components/inicio/kpi-card.tsx`**

```tsx
type KpiCardProps = {
  label: string;
  value: string;
};

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/page.tsx`**

```tsx
import { KpiCard } from '@/components/inicio/kpi-card';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { productosService } from '@/lib/services/productosService';
import { gastosService } from '@/lib/services/gastosService';

const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export default async function Home() {
  const [proveedores, productos, gastos] = await Promise.all([
    proveedoresService.listar(),
    productosService.listar(),
    gastosService.listar(),
  ]);

  const totalGastos = gastos.reduce((suma, gasto) => suma + gasto.monto, 0);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumen general del emprendimiento.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Proveedores" value={String(proveedores.length)} />
        <KpiCard label="Productos" value={String(productos.length)} />
        <KpiCard label="Gastos" value={FORMATO_MONEDA.format(totalGastos)} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify the build and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run build
git add src/components/inicio/kpi-card.tsx src/app/page.tsx
git commit -m "feat: add Inicio dashboard with KPI cards"
```

---

### Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run test
```

Expected: all tests pass, including the updated `categoriasService`/`proveedoresService` suites.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`, route list unchanged (`/`, `/gastos`, `/productos`, `/proveedores`).

- [ ] **Step 3: Run the linter**

```bash
npm run lint
```

Expected: no new errors beyond the two pre-existing, unrelated findings already present before this branch (`src/hooks/use-mobile.ts`, `src/components/ui/data-table.tsx`).

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Open the app in a browser and confirm: Inter font renders everywhere; the sidebar shows the "Gestión de Proveedores" brand block (no "Navegación" label); the header shows the current section name and a working theme toggle that switches the whole app between light and dark instantly, including the sidebar's rosa accent on the active nav item; `/` shows 3 KPI cards with real numbers; `/proveedores` and `/productos` show the new `text-2xl` header + subtitle, a `rounded-lg` table container, and colored category badges (not gray); `/gastos` looks unchanged (already compliant); toggling dark mode and reloading the page keeps the choice (persisted via `next-themes`' `localStorage`).

- [ ] **Step 5: Push the branch (do not open a PR yet — hand back to the user first)**

```bash
git push -u origin feature/design-system-rebrand
```
