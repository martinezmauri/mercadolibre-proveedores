# Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent shadcn sidebar (Inicio / Proveedores), switch the app's typography from Geist to Poppins, and restyle the `/proveedores` view to use the full content width with a larger, left-aligned title.

**Architecture:** shadcn's official `Sidebar` component (`SidebarProvider` + `Sidebar` + `SidebarInset`) wraps the app in the root layout; a new `AppSidebar` client component renders the two nav links and highlights the active one via `usePathname()`. The root page (`/`) stops redirecting and becomes a genuinely empty page. No business logic changes — this is shell/styling work only.

**Tech Stack:** Next.js App Router, shadcn/ui (`Sidebar` component, `neutral` base color — already configured), Tailwind CSS v4, `next/font/google` (Poppins), `lucide-react` icons (already a dependency).

## Global Constraints

- No new business logic, no changes to `src/lib/services/*`, `src/app/proveedores/actions.ts`, or any proveedores CRUD behavior — this plan is shell/styling only.
- Color palette stays black/white/gray — shadcn is already initialized with `baseColor: "neutral"` in `components.json`; do not change it.
- No automated tests required for this plan (per the project's spec — tests cover only `src/lib/services/*`); verification is manual + build/tsc.
- TypeScript strict, no `any`, no `@ts-ignore`. Only shadcn/ui components for interactive UI elements.
- Sidebar has exactly two nav items for now: "Inicio" (`/`) and "Proveedores" (`/proveedores`) — no other items, no user/account menu, no collapsible groups beyond what shadcn's `add sidebar` scaffolds by default.

---

### Task 1: Sidebar shell — install, wire into layout, blank Inicio page

**Files:**
- Create: `src/components/ui/sidebar.tsx` (+ any dependency files shadcn's `add sidebar` pulls in, typically `src/hooks/use-mobile.tsx` and possibly `src/components/ui/separator.tsx`/`sheet.tsx`/`tooltip.tsx`/`skeleton.tsx` if not already present — check `ls src/components/ui/` after running the command)
- Create: `src/components/layout/app-sidebar.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `<AppSidebar />` (no props) — a client component rendering the two-item nav; consumed only by `layout.tsx` in this plan.
- Produces: root layout now wraps `{children}` in `SidebarProvider`/`SidebarInset` — later tasks (2, 3) build on top of this same `layout.tsx` and don't need to know its internals beyond "the font variables are set on `<html>`'s className."

- [ ] **Step 1: Install shadcn's Sidebar component**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx shadcn@latest add sidebar -y
```

Expected: creates `src/components/ui/sidebar.tsx` with real content (`Sidebar`, `SidebarProvider`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarInset`, `SidebarTrigger` all exported), plus whatever dependency files it pulls in (e.g. `src/hooks/use-mobile.tsx`). **If the installed shadcn CLI's current preset (`radix-nova`, per `components.json`) returns an empty/stub file for `sidebar`** (a prior task in this project hit exactly this for the `form` component), fetch it from the classic registry instead: `npx shadcn@latest add "https://ui.shadcn.com/r/styles/new-york-v4/sidebar.json" -y` — this project already mixes `radix-nova` + `new-york-v4` sources safely (see `src/components/ui/form.tsx`, `src/components/ui/alert-dialog.tsx` for precedent), since both share the unified `radix-ui` package. Verify the resulting file has real content before proceeding.

- [ ] **Step 2: Create the app sidebar navigation component**

`src/components/layout/app-sidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Truck } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
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

- [ ] **Step 3: Wire the sidebar into the root layout**

`src/app/layout.tsx` (font imports/variables unchanged in this step — Task 2 handles the Poppins swap):

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
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
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Make the root page a genuinely blank "Inicio" page**

`src/app/page.tsx` (replaces the redirect added in an earlier code-review fix — now that there's real navigation to `/`, it should render, not redirect away):

```tsx
export default function Home() {
  return null;
}
```

- [ ] **Step 5: Verify**

```bash
npm run build
```

Expected: `Compiled successfully`, route list includes both `/` and `/proveedores`.

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add sidebar shell with Inicio/Proveedores navigation"
```

---

### Task 2: Typography — switch Geist to Poppins

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `src/app/layout.tsx` from Task 1 (this task only touches the font import/variable lines and the `<html>` className, not the sidebar wiring).

- [ ] **Step 1: Swap the Sans font from Geist to Poppins**

In `src/app/layout.tsx`, replace:

```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

with:

```tsx
import { Poppins, Geist_Mono } from "next/font/google";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

And update the `<html>` element's `className` from:

```tsx
className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
```

to:

```tsx
className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
```

- [ ] **Step 2: Fix the `--font-sans` wiring in the Tailwind theme**

In `src/app/globals.css`, find this line inside the `@theme inline { ... }` block (currently a circular self-reference that means Geist/Poppins never actually reached the `font-sans` Tailwind utility):

```css
--font-sans: var(--font-sans);
```

Replace it with:

```css
--font-sans: var(--font-poppins);
```

- [ ] **Step 3: Verify**

```bash
npm run build
```

Expected: `Compiled successfully`.

```bash
npx tsc --noEmit
```

Expected: clean.

Grep to confirm no stray reference to the removed `geistSans`/`--font-geist-sans` remains:

```bash
grep -rn "geistSans\|font-geist-sans" src/
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style: switch typography from Geist to Poppins"
```

---

### Task 3: Restyle the /proveedores view — full width, bigger left-aligned title

**Files:**
- Modify: `src/app/proveedores/page.tsx`

**Interfaces:**
- Consumes: `SidebarInset` from Task 1 already constrains the content area's width — this task just removes the page's own additional width constraint so it fills that area.

- [ ] **Step 1: Remove the width constraint and enlarge the title**

Replace the full content of `src/app/proveedores/page.tsx`:

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
        <h1 className="text-4xl font-semibold">Proveedores</h1>
        <FormularioProveedor categorias={categorias} trigger={<Button>Nuevo proveedor</Button>} />
      </div>
      <TablaProveedores proveedores={proveedores} categorias={categorias} />
    </main>
  );
}
```

(Only the `<main>` className — `mx-auto max-w-5xl space-y-6 p-6` → `space-y-6 p-6` — and the `<h1>` className — `text-2xl font-semibold` → `text-4xl font-semibold` — changed. Everything else is identical to the current file.)

- [ ] **Step 2: Verify**

```bash
npm run build
```

Expected: `Compiled successfully`, `/proveedores` still listed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: make proveedores view full-width with a larger left-aligned title"
```

---

### Task 4: Manual verification and push

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000`.

- [ ] **Step 2: Manual test pass**

- Visit `http://localhost:3000/` — page loads with the sidebar visible on the left, showing "Inicio" and "Proveedores"; the main content area is empty; "Inicio" is highlighted as the active item.
- Click "Proveedores" in the sidebar — navigates to `/proveedores`; "Proveedores" is now highlighted as active; "Inicio" is not.
- On `/proveedores`: the title "Proveedores" is visibly larger than before and flush with the left edge of the content area (not centered in the browser window); the table stretches to fill the content area's width; the "Nuevo proveedor" button is on the right, in line with the title.
- Confirm the sidebar's collapse trigger (top-left, inside the content area) toggles the sidebar open/closed.
- Confirm the body text now renders in Poppins (check via browser dev tools' computed styles on any text element, or simply that the look has visibly changed from the previous Geist look).
- Confirm no console errors in the browser dev tools on either route.

- [ ] **Step 3: Run the full test suite and build one more time**

```bash
npm test
npm run build
```

Expected: all existing tests still pass (unaffected by this plan), build succeeds.

- [ ] **Step 4: Push**

```bash
git push -u origin feature/listado-proveedores
```

Expected: branch pushed/updated on `https://github.com/martinezmauri/mercadolibre-proveedores`.
