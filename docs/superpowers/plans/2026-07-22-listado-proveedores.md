# Listado de Proveedores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first sub-project of the MercadoLibre operations tool: a `/proveedores` page backed by Supabase where two people (no login, private link only) can list, create, edit, and delete suppliers with name, URL, minimum purchase, WhatsApp, and multi-select categories.

**Architecture:** Next.js (App Router, TypeScript, src/ layout) talks to Supabase exclusively from the server. Server Actions act as the thin "controller" layer and call one small service file per entity (`categoriasService`, `proveedoresService`); those services use `@supabase/supabase-js` with the project's secret key, which never reaches the browser. Categories live in their own `categorias` table (shared taxonomy, reused later by products) linked to `proveedores` through a `proveedor_categorias` join table.

**Tech Stack:** Next.js (latest, App Router) · TypeScript strict · Tailwind CSS · shadcn/ui + TanStack React Table (DataTable pattern) · React Hook Form + Zod · Supabase (`@supabase/supabase-js`) · Vitest for service-layer tests · Sonner for toasts.

## Global Constraints

- No login/auth — access is by private link only (spec: `docs/superpowers/specs/2026-07-22-proveedores-design.md`).
- Node v24.16.0 / npm 11.13.0 are available in this environment.
- Supabase project: id `vngsqjzlmqcpxlxtkbel`, URL `https://vngsqjzlmqcpxlxtkbel.supabase.co`, Postgres 17, currently has zero tables in `public`.
- GitHub repo (public, already created and pushed): `https://github.com/martinezmauri/mercadolibre-proveedores`, branch `main`.
- Business-domain names (tables/columns/UI copy) are in Spanish: `proveedores`, `categorias`, `nombre`, `url`, `compra_minima`, `whatsapp`.
- The Supabase secret key must never reach the browser — it is only read inside server-side code (Server Actions / service files), never in a `'use client'` component or a `NEXT_PUBLIC_*` var.
- No i18n (next-intl), no separate repository/Drizzle layer, no dual Bearer/cookie auth — deliberate simplifications given the scope (2 users, no mobile app, single language). This is a documented deviation from the default 42i Next.js template, not an oversight.
- Automated tests cover only `src/lib/services/*` (per the approved spec); UI is verified manually in the last task.
- The design doc sketched a `hooks/use-proveedores.ts` for client-side list state. It's dropped in this plan: the page is a Server Component that reads straight from the services, and Server Actions call `revalidatePath('/proveedores')` to refresh it — no client-side list state ends up being needed. If a future sub-project needs optimistic updates or client-side filtering, add the hook then.
- Always use shadcn/ui components (never raw `<table>`/`<input>`/`<button>`), path alias `@/*`, Server Components by default (`'use client'` only where interactivity is needed).

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: entire Next.js scaffold (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.eslintrc*`, etc.)
- Modify: `.gitignore` (merged with the Next.js default one)

**Interfaces:**
- Produces: a buildable Next.js app at the repo root with `src/app`, `src/components`, `src/lib`, `src/types`, `src/hooks` available for later tasks.

- [ ] **Step 1: Scaffold into a scratch folder (the repo root already has `.git`, `.env`, `.gitignore`, `docs/`, so we scaffold elsewhere and merge in, avoiding create-next-app's non-empty-directory prompt)**

```bash
cd "C:\Users\Mauri\AppData\Local\Temp\claude\C--Users-Mauri-OneDrive-Escritorio-MercadoLibre\22f06d3d-a70f-40f5-b2df-a69e14c33455\scratchpad"
npx create-next-app@latest proveedores-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: command finishes with `Success! Created proveedores-scaffold ...` and no interactive prompt left unanswered.

- [ ] **Step 2: Drop the scratch git repo and node_modules, then merge everything else into the project root**

```bash
SCRATCH="C:\Users\Mauri\AppData\Local\Temp\claude\C--Users-Mauri-OneDrive-Escritorio-MercadoLibre\22f06d3d-a70f-40f5-b2df-a69e14c33455\scratchpad\proveedores-scaffold"
PROJECT="C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
rm -rf "$SCRATCH/.git" "$SCRATCH/node_modules"
cp -a "$SCRATCH/." "$PROJECT/"
```

Expected: `ls "$PROJECT"` now shows `src/`, `package.json`, `next.config.ts`, `tsconfig.json`, alongside the pre-existing `.git/`, `.env`, `docs/`.

- [ ] **Step 3: Confirm `.env` is still ignored and install dependencies**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
grep -n "env" .gitignore
npm install
```

Expected: `.gitignore` contains an `.env*` (or `.env`) line, and `npm install` completes with no errors.

- [ ] **Step 4: Verify the build**

```bash
npm run build
```

Expected: output ends with `Compiled successfully` and a route summary listing `/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app (App Router, TS, Tailwind, src/)"
```

---

### Task 2: shadcn/ui, DataTable, and supporting libraries

**Files:**
- Create: `src/components/ui/*` (shadcn primitives: button, form, input, dialog, table, badge, checkbox, label, sonner)
- Create: `src/components/ui/data-table.tsx`

**Interfaces:**
- Consumes: Task 1's `src/` layout and Tailwind config.
- Produces: `DataTable<TData, TValue>({ columns, data, emptyMessage? })` component used by Task 8; shadcn primitives (`Button`, `Input`, `Dialog`, `Form`, `Badge`, `Checkbox`, `Label`) used by Tasks 7-8; `sonner`'s `toast` used by Tasks 7-8.

- [ ] **Step 1: Init shadcn/ui with defaults**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx shadcn@latest init -d -y
```

Expected: creates `components.json` and `src/lib/utils.ts` (the `cn()` helper), no unanswered prompts.

- [ ] **Step 2: Add the primitives this feature needs**

```bash
npx shadcn@latest add button form input dialog table badge checkbox label sonner -y
```

Expected: files appear under `src/components/ui/` for each component listed; command exits 0.

- [ ] **Step 3: Install the remaining libraries (shadcn doesn't install these)**

```bash
npm install @tanstack/react-table react-hook-form zod @hookform/resolvers @supabase/supabase-js
```

Expected: `package.json` `dependencies` now include all five packages.

- [ ] **Step 4: Create the generic DataTable wrapper**

`src/components/ui/data-table.tsx`:

```tsx
'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = 'Sin resultados',
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Verify the build still passes**

```bash
npm run build
```

Expected: `Compiled successfully`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add shadcn/ui, DataTable wrapper, and Supabase/RHF/Zod deps"
```

---

### Task 3: Supabase schema — categorias, proveedores, proveedor_categorias

**Files:**
- Create: `supabase/migrations/<timestamp>_proveedores_schema.sql` (copy of the applied SQL, kept in the repo for history/reference — this project doesn't use the local Supabase CLI/Docker stack, so this file is documentation of what was applied remotely, not a file the CLI replays)

**Interfaces:**
- Produces: tables `public.categorias(id uuid, nombre text)`, `public.proveedores(id uuid, nombre text, url text, compra_minima numeric, whatsapp text, created_at timestamptz)`, `public.proveedor_categorias(proveedor_id uuid, categoria_id uuid)` — consumed by Task 4/5 services.

- [ ] **Step 1: Apply the migration via the Supabase MCP tool**

Call `mcp__plugin_supabase_supabase__apply_migration` with `project_id: "vngsqjzlmqcpxlxtkbel"`, `name: "proveedores_schema"`, and this `query`:

```sql
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  url text not null,
  compra_minima numeric,
  whatsapp text,
  created_at timestamptz not null default now()
);

create table public.proveedor_categorias (
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  primary key (proveedor_id, categoria_id)
);

alter table public.categorias enable row level security;
alter table public.proveedores enable row level security;
alter table public.proveedor_categorias enable row level security;

insert into public.categorias (nombre) values
  ('hogar'), ('cocina'), ('limpieza'), ('electrónica'), ('tecnología'),
  ('belleza'), ('cuidado personal'), ('salud'), ('bienestar'), ('arte'),
  ('manualidades'), ('mascotas');
```

Expected: tool returns success (no SQL error).

No RLS policies are created for `anon`/`authenticated` — this is intentional: RLS enabled + zero policies means those roles get zero rows/writes by default. Only the secret key (used server-side, which bypasses RLS) can read/write, matching the "no login, but no back door" design decision.

- [ ] **Step 2: Verify the schema**

Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "vngsqjzlmqcpxlxtkbel"` and `query: "select nombre from public.categorias order by nombre;"`.

Expected: 12 rows back (arte, belleza, bienestar, cocina, cuidado personal, electrónica, hogar, limpieza, manualidades, mascotas, salud, tecnología).

- [ ] **Step 3: Run the security advisor**

Call `mcp__plugin_supabase_supabase__get_advisors` with `project_id: "vngsqjzlmqcpxlxtkbel"`, `type: "security"`.

Expected: no `ERROR`-level findings. An informational note that `proveedor_categorias`/`proveedores`/`categorias` have RLS enabled with no policies is expected and fine (that's the intended default-deny state).

- [ ] **Step 4: Save the applied SQL into the repo for history**

```bash
mkdir -p "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre\supabase\migrations"
TS=$(date +%Y%m%d%H%M%S)
```

Write the same SQL from Step 1 into `supabase/migrations/${TS}_proveedores_schema.sql` (create the file with that exact content).

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add supabase/migrations
git commit -m "feat(db): create categorias/proveedores/proveedor_categorias schema with RLS"
```

---

### Task 4: Supabase server client, env config, test harness, and categoriasService

**Files:**
- Create: `.env.example`
- Create: `src/lib/supabase/server.ts`
- Create: `src/types/proveedor.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script and devDependencies)
- Create: `src/lib/services/testUtils/supabaseQueryMock.ts`
- Create: `src/lib/services/categoriasService.ts`
- Test: `src/lib/services/categoriasService.test.ts`

**Interfaces:**
- Produces: `createSupabaseServerClient(): SupabaseClient` (used by every service); `Categoria = { id: string; nombre: string }` and `Proveedor`/`ProveedorInput` types (used by Task 5, 6, 7, 8); `categoriasService.listar(): Promise<Categoria[]>` (used by Task 8's page and form); `createQueryMock(result: { data: unknown; error: unknown })` test helper (reused by Task 5's tests).

- [ ] **Step 1: Install test dependencies**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm install -D vitest vite-tsconfig-paths
```

Expected: both added under `devDependencies`.

- [ ] **Step 2: Add the Vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add the `test` script**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Env template**

`.env.example`:

```
SUPABASE_URL=https://vngsqjzlmqcpxlxtkbel.supabase.co
SUPABASE_SECRET_KEY=
```

Then tell the user (this cannot be automated — it's a secret credential): copy `.env.example` to `.env.local`, fill `SUPABASE_URL` with the value above, and fill `SUPABASE_SECRET_KEY` with the **secret key** from the Supabase dashboard → this project → Project Settings → API Keys (the "secret" key, not the "publishable" one). `.env.local` must stay out of git (already covered by the `.env*` line in `.gitignore` from Task 1).

- [ ] **Step 5: Supabase server client**

`src/lib/supabase/server.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 6: Shared types**

`src/types/proveedor.ts`:

```ts
export type Categoria = {
  id: string;
  nombre: string;
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

- [ ] **Step 7: Shared Supabase query-chain test mock**

`src/lib/services/testUtils/supabaseQueryMock.ts`:

```ts
import { vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };

export function createQueryMock(result: QueryResult) {
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'order'];
  const mock: Record<string, unknown> = {};

  chainMethods.forEach((method) => {
    mock[method] = vi.fn().mockReturnValue(mock);
  });

  mock.single = vi.fn().mockResolvedValue(result);
  mock.then = (resolve: (value: QueryResult) => unknown) => resolve(result);

  return mock;
}
```

- [ ] **Step 8: Write the failing test for categoriasService**

`src/lib/services/categoriasService.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { categoriasService } from './categoriasService';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

describe('categoriasService.listar', () => {
  it('devuelve las categorías ordenadas por nombre', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: '1', nombre: 'cocina' },
        { id: '2', nombre: 'hogar' },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const result = await categoriasService.listar();

    expect(from).toHaveBeenCalledWith('categorias');
    expect(select).toHaveBeenCalledWith('id, nombre');
    expect(order).toHaveBeenCalledWith('nombre');
    expect(result).toEqual([
      { id: '1', nombre: 'cocina' },
      { id: '2', nombre: 'hogar' },
    ]);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'timeout' } });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    await expect(categoriasService.listar()).rejects.toThrow(
      'No se pudieron cargar las categorías: timeout'
    );
  });
});
```

- [ ] **Step 9: Run it to confirm it fails**

```bash
npx vitest run src/lib/services/categoriasService.test.ts
```

Expected: FAIL — `Cannot find module './categoriasService'`.

- [ ] **Step 10: Implement categoriasService**

`src/lib/services/categoriasService.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Categoria } from '@/types/proveedor';

export const categoriasService = {
  async listar(): Promise<Categoria[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('categorias').select('id, nombre').order('nombre');

    if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
    return data as Categoria[];
  },
};
```

- [ ] **Step 11: Run it to confirm it passes**

```bash
npx vitest run src/lib/services/categoriasService.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add Supabase server client, shared types, and categoriasService"
```

---

### Task 5: proveedoresService (TDD: listar, crear, actualizar, eliminar)

**Files:**
- Create: `src/lib/services/proveedoresService.ts`
- Test: `src/lib/services/proveedoresService.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` and `createQueryMock` from Task 4; `Proveedor`/`ProveedorInput` types from Task 4.
- Produces: `proveedoresService.listar(): Promise<Proveedor[]>`, `proveedoresService.crear(input: ProveedorInput): Promise<Proveedor>`, `proveedoresService.actualizar(id: string, input: ProveedorInput): Promise<Proveedor>`, `proveedoresService.eliminar(id: string): Promise<void>` — all consumed by Task 6's Server Actions.

- [ ] **Step 1: Write the failing tests**

`src/lib/services/proveedoresService.test.ts`:

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
      const from = vi.fn().mockReturnValue(
        createQueryMock({
          data: [
            {
              id: 'p1',
              nombre: 'Mayorista Uno',
              url: 'https://mayorista-uno.com',
              compra_minima: 100,
              whatsapp: '5491122334455',
              created_at: '2026-07-22T00:00:00.000Z',
              proveedor_categorias: [
                { categorias: { id: 'c1', nombre: 'hogar' } },
                { categorias: { id: 'c2', nombre: 'cocina' } },
              ],
            },
          ],
          error: null,
        })
      );
      mockedCreateClient.mockReturnValue({ from });

      const result = await proveedoresService.listar();

      expect(from).toHaveBeenCalledWith('proveedores');
      expect(result).toEqual([
        {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compraMinima: 100,
          whatsapp: '5491122334455',
          createdAt: '2026-07-22T00:00:00.000Z',
          categorias: [
            { id: 'c1', nombre: 'hogar' },
            { id: 'c2', nombre: 'cocina' },
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
    it('inserta el proveedor, asigna categorías y devuelve el registro completo', async () => {
      const insertResult = createQueryMock({ data: { id: 'p1' }, error: null });
      const categoriasInsertResult = createQueryMock({ data: null, error: null });
      const finalRead = createQueryMock({
        data: {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compra_minima: 100,
          whatsapp: '5491122334455',
          created_at: '2026-07-22T00:00:00.000Z',
          proveedor_categorias: [{ categorias: { id: 'c1', nombre: 'hogar' } }],
        },
        error: null,
      });

      const from = vi
        .fn()
        .mockReturnValueOnce(insertResult)
        .mockReturnValueOnce(categoriasInsertResult)
        .mockReturnValueOnce(finalRead);

      mockedCreateClient.mockReturnValue({ from });

      const result = await proveedoresService.crear({
        nombre: 'Mayorista Uno',
        url: 'https://mayorista-uno.com',
        compraMinima: 100,
        whatsapp: '5491122334455',
        categoriaIds: ['c1'],
      });

      expect(from).toHaveBeenNthCalledWith(1, 'proveedores');
      expect(from).toHaveBeenNthCalledWith(2, 'proveedor_categorias');
      expect(from).toHaveBeenNthCalledWith(3, 'proveedores');
      expect(result.id).toBe('p1');
      expect(result.categorias).toEqual([{ id: 'c1', nombre: 'hogar' }]);
    });
  });

  describe('actualizar', () => {
    it('actualiza los datos y reemplaza las categorías asignadas', async () => {
      const updateResult = createQueryMock({ data: null, error: null });
      const deleteCategoriasResult = createQueryMock({ data: null, error: null });
      const insertCategoriasResult = createQueryMock({ data: null, error: null });
      const finalRead = createQueryMock({
        data: {
          id: 'p1',
          nombre: 'Mayorista Uno Actualizado',
          url: 'https://mayorista-uno.com',
          compra_minima: 150,
          whatsapp: '5491122334455',
          created_at: '2026-07-22T00:00:00.000Z',
          proveedor_categorias: [{ categorias: { id: 'c2', nombre: 'cocina' } }],
        },
        error: null,
      });

      const from = vi
        .fn()
        .mockReturnValueOnce(updateResult)
        .mockReturnValueOnce(deleteCategoriasResult)
        .mockReturnValueOnce(insertCategoriasResult)
        .mockReturnValueOnce(finalRead);

      mockedCreateClient.mockReturnValue({ from });

      const result = await proveedoresService.actualizar('p1', {
        nombre: 'Mayorista Uno Actualizado',
        url: 'https://mayorista-uno.com',
        compraMinima: 150,
        whatsapp: '5491122334455',
        categoriaIds: ['c2'],
      });

      expect(result.nombre).toBe('Mayorista Uno Actualizado');
      expect(result.categorias).toEqual([{ id: 'c2', nombre: 'cocina' }]);
    });
  });

  describe('eliminar', () => {
    it('elimina el proveedor por id', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null }));
      mockedCreateClient.mockReturnValue({ from });

      await proveedoresService.eliminar('p1');

      expect(from).toHaveBeenCalledWith('proveedores');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(proveedoresService.eliminar('p1')).rejects.toThrow(
        'No se pudo eliminar el proveedor: fk violation'
      );
    });
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run src/lib/services/proveedoresService.test.ts
```

Expected: FAIL — `Cannot find module './proveedoresService'`.

- [ ] **Step 3: Implement proveedoresService**

`src/lib/services/proveedoresService.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Proveedor, ProveedorInput } from '@/types/proveedor';

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

type ProveedorRow = {
  id: string;
  nombre: string;
  url: string;
  compra_minima: number | null;
  whatsapp: string | null;
  created_at: string;
  proveedor_categorias: { categorias: { id: string; nombre: string } }[];
};

const SELECT_CON_CATEGORIAS = `
  id, nombre, url, compra_minima, whatsapp, created_at,
  proveedor_categorias ( categorias ( id, nombre ) )
`;

function mapRow(row: ProveedorRow): Proveedor {
  return {
    id: row.id,
    nombre: row.nombre,
    url: row.url,
    compraMinima: row.compra_minima,
    whatsapp: row.whatsapp,
    createdAt: row.created_at,
    categorias: row.proveedor_categorias.map((pc) => pc.categorias),
  };
}

async function asignarCategorias(
  supabase: SupabaseServerClient,
  proveedorId: string,
  categoriaIds: string[]
): Promise<void> {
  if (categoriaIds.length === 0) return;

  const { error } = await supabase
    .from('proveedor_categorias')
    .insert(categoriaIds.map((categoriaId) => ({ proveedor_id: proveedorId, categoria_id: categoriaId })));

  if (error) throw new Error(`No se pudieron asignar las categorías: ${error.message}`);
}

async function obtenerPorId(supabase: SupabaseServerClient, id: string): Promise<Proveedor> {
  const { data, error } = await supabase
    .from('proveedores')
    .select(SELECT_CON_CATEGORIAS)
    .eq('id', id)
    .single();

  if (error) throw new Error(`No se pudo leer el proveedor: ${error.message}`);
  return mapRow(data as ProveedorRow);
}

export const proveedoresService = {
  async listar(): Promise<Proveedor[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('proveedores')
      .select(SELECT_CON_CATEGORIAS)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`No se pudieron cargar los proveedores: ${error.message}`);
    return (data as ProveedorRow[]).map(mapRow);
  },

  async crear(input: ProveedorInput): Promise<Proveedor> {
    const supabase = createSupabaseServerClient();
    const { data: inserted, error: insertError } = await supabase
      .from('proveedores')
      .insert({
        nombre: input.nombre,
        url: input.url,
        compra_minima: input.compraMinima,
        whatsapp: input.whatsapp,
      })
      .select('id')
      .single();

    if (insertError) throw new Error(`No se pudo crear el proveedor: ${insertError.message}`);

    await asignarCategorias(supabase, (inserted as { id: string }).id, input.categoriaIds);
    return obtenerPorId(supabase, (inserted as { id: string }).id);
  },

  async actualizar(id: string, input: ProveedorInput): Promise<Proveedor> {
    const supabase = createSupabaseServerClient();
    const { error: updateError } = await supabase
      .from('proveedores')
      .update({
        nombre: input.nombre,
        url: input.url,
        compra_minima: input.compraMinima,
        whatsapp: input.whatsapp,
      })
      .eq('id', id);

    if (updateError) throw new Error(`No se pudo actualizar el proveedor: ${updateError.message}`);

    await supabase.from('proveedor_categorias').delete().eq('proveedor_id', id);
    await asignarCategorias(supabase, id, input.categoriaIds);

    return obtenerPorId(supabase, id);
  },

  async eliminar(id: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('proveedores').delete().eq('id', id);
    if (error) throw new Error(`No se pudo eliminar el proveedor: ${error.message}`);
  },
};
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npx vitest run src/lib/services/proveedoresService.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (categoriasService + proveedoresService).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add proveedoresService with full CRUD and category assignment"
```

---

### Task 6: Validation schema + Server Actions

**Files:**
- Create: `src/lib/validation/proveedorSchema.ts`
- Create: `src/app/proveedores/actions.ts`

**Interfaces:**
- Consumes: `proveedoresService` from Task 5.
- Produces: `proveedorSchema: ZodSchema`, `ProveedorFormValues` type, `crearProveedorAction(input: unknown): Promise<void>`, `actualizarProveedorAction(id: string, input: unknown): Promise<void>`, `eliminarProveedorAction(id: string): Promise<void>` — all consumed by Task 7 (form) and Task 8 (table row actions).

- [ ] **Step 1: Zod schema**

`src/lib/validation/proveedorSchema.ts`:

```ts
import { z } from 'zod';

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  url: z.string().url('Ingresá una URL válida'),
  compraMinima: z.coerce.number().min(0, 'La compra mínima no puede ser negativa').nullable(),
  whatsapp: z.string().nullable(),
  categoriaIds: z.array(z.string()).default([]),
});

export type ProveedorFormValues = z.infer<typeof proveedorSchema>;
```

- [ ] **Step 2: Server Actions**

`src/app/proveedores/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { proveedorSchema } from '@/lib/validation/proveedorSchema';

export async function crearProveedorAction(input: unknown): Promise<void> {
  const parsed = proveedorSchema.parse(input);
  await proveedoresService.crear(parsed);
  revalidatePath('/proveedores');
}

export async function actualizarProveedorAction(id: string, input: unknown): Promise<void> {
  const parsed = proveedorSchema.parse(input);
  await proveedoresService.actualizar(id, parsed);
  revalidatePath('/proveedores');
}

export async function eliminarProveedorAction(id: string): Promise<void> {
  await proveedoresService.eliminar(id);
  revalidatePath('/proveedores');
}
```

- [ ] **Step 3: Verify the build**

```bash
npm run build
```

Expected: `Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Zod validation and Server Actions for proveedores"
```

---

### Task 7: UI — category selector and provider form dialog

**Files:**
- Create: `src/components/proveedores/selector-categorias.tsx`
- Create: `src/components/proveedores/formulario-proveedor.tsx`

**Interfaces:**
- Consumes: `Categoria`/`Proveedor` types (Task 4), `proveedorSchema`/`ProveedorFormValues` (Task 6), `crearProveedorAction`/`actualizarProveedorAction` (Task 6), shadcn `Checkbox`/`Label`/`Dialog`/`Form`/`Input`/`Button` (Task 2).
- Produces: `SelectorCategorias({ categorias, seleccionadas, onChange })`; `FormularioProveedor({ categorias, proveedor?, trigger })` — consumed by Task 8's columns and page.

- [ ] **Step 1: Category selector**

`src/components/proveedores/selector-categorias.tsx`:

```tsx
'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Categoria } from '@/types/proveedor';

type SelectorCategoriasProps = {
  categorias: Categoria[];
  seleccionadas: string[];
  onChange: (categoriaIds: string[]) => void;
};

export function SelectorCategorias({ categorias, seleccionadas, onChange }: SelectorCategoriasProps) {
  function toggle(categoriaId: string, checked: boolean) {
    if (checked) {
      onChange([...seleccionadas, categoriaId]);
    } else {
      onChange(seleccionadas.filter((id) => id !== categoriaId));
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {categorias.map((categoria) => (
        <div key={categoria.id} className="flex items-center gap-2">
          <Checkbox
            id={`categoria-${categoria.id}`}
            checked={seleccionadas.includes(categoria.id)}
            onCheckedChange={(checked) => toggle(categoria.id, checked === true)}
          />
          <Label htmlFor={`categoria-${categoria.id}`}>{categoria.nombre}</Label>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Provider form dialog**

`src/components/proveedores/formulario-proveedor.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SelectorCategorias } from '@/components/proveedores/selector-categorias';
import { proveedorSchema, type ProveedorFormValues } from '@/lib/validation/proveedorSchema';
import { crearProveedorAction, actualizarProveedorAction } from '@/app/proveedores/actions';
import type { Categoria, Proveedor } from '@/types/proveedor';

type FormularioProveedorProps = {
  categorias: Categoria[];
  proveedor?: Proveedor;
  trigger: React.ReactNode;
};

export function FormularioProveedor({ categorias, proveedor, trigger }: FormularioProveedorProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      nombre: proveedor?.nombre ?? '',
      url: proveedor?.url ?? '',
      compraMinima: proveedor?.compraMinima ?? null,
      whatsapp: proveedor?.whatsapp ?? '',
      categoriaIds: proveedor?.categorias.map((c) => c.id) ?? [],
    },
  });

  async function onSubmit(values: ProveedorFormValues) {
    try {
      if (proveedor) {
        await actualizarProveedorAction(proveedor.id, values);
        toast.success('Proveedor actualizado');
      } else {
        await crearProveedorAction(values);
        toast.success('Proveedor creado');
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compraMinima"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compra mínima</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoriaIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorías</FormLabel>
                  <FormControl>
                    <SelectorCategorias
                      categorias={categorias}
                      seleccionadas={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{proveedor ? 'Guardar cambios' : 'Crear proveedor'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Verify the build**

```bash
npm run build
```

Expected: `Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): add category selector and provider form dialog"
```

---

### Task 8: UI — providers table and the `/proveedores` page

**Files:**
- Create: `src/components/proveedores/columnas-proveedores.tsx`
- Create: `src/components/proveedores/tabla-proveedores.tsx`
- Create: `src/app/proveedores/page.tsx`

**Interfaces:**
- Consumes: `DataTable` (Task 2), `FormularioProveedor` (Task 7), `eliminarProveedorAction` (Task 6), `proveedoresService`/`categoriasService` (Task 4/5).
- Produces: the `/proveedores` route, fully wired.

- [ ] **Step 1: Column definitions**

`src/components/proveedores/columnas-proveedores.tsx`:

```tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import { eliminarProveedorAction } from '@/app/proveedores/actions';
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
            <Badge key={categoria.id} variant="secondary">
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
        <div className="flex gap-2">
          <FormularioProveedor
            categorias={categorias}
            proveedor={row.original}
            trigger={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await eliminarProveedorAction(row.original.id);
              toast.success('Proveedor eliminado');
            }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];
}
```

- [ ] **Step 2: Table component**

`src/components/proveedores/tabla-proveedores.tsx`:

```tsx
'use client';

import { DataTable } from '@/components/ui/data-table';
import { crearColumnas } from '@/components/proveedores/columnas-proveedores';
import type { Categoria, Proveedor } from '@/types/proveedor';

type TablaProveedoresProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function TablaProveedores({ proveedores, categorias }: TablaProveedoresProps) {
  return (
    <DataTable
      columns={crearColumnas(categorias)}
      data={proveedores}
      emptyMessage="No hay proveedores cargados"
    />
  );
}
```

- [ ] **Step 3: Page**

`src/app/proveedores/page.tsx`:

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
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Proveedores</h1>
        <FormularioProveedor categorias={categorias} trigger={<Button>Nuevo proveedor</Button>} />
      </div>
      <TablaProveedores proveedores={proveedores} categorias={categorias} />
    </main>
  );
}
```

- [ ] **Step 4: Verify the build**

```bash
npm run build
```

Expected: `Compiled successfully`, with `/proveedores` listed among the routes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): wire up the proveedores table and page"
```

---

### Task 9: Manual end-to-end verification and push

**Files:** none (verification only)

- [ ] **Step 1: Confirm `.env.local` is filled in**

Ask the user to confirm `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set in `.env.local` (created in Task 4, Step 4) before starting the dev server.

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000`.

- [ ] **Step 3: Manual test pass on `http://localhost:3000/proveedores`**

- Page loads with an empty table and a "Nuevo proveedor" button.
- Create a provider with all fields + 2+ categories → row appears with clickable URL, `wa.me` link, and category badges.
- Edit that provider (change name, add/remove a category) → row updates.
- Delete it → row disappears.
- Submitting with an empty name or invalid URL shows inline validation errors and does not hit the database.

- [ ] **Step 4: Run the full test suite and build one more time**

```bash
npm test
npm run build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 5: Push**

```bash
git push origin main
```

Expected: `main` on `https://github.com/martinezmauri/mercadolibre-proveedores` is up to date with local history.
