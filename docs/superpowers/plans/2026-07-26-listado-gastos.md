# Listado de Gastos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/gastos` page for tracking business expenses (nombre, quién gastó, categoría opcional, monto en ARS), with full CRUD, colored badges for persona/categoría, and selector-style filters (persona, categoría, rango de fecha por creado/actualizado) applied client-side.

**Architecture:** Same layered pattern as `productos`/`proveedores` — Server Component page fetches data, thin Server Actions validate+delegate, service modules talk to Supabase directly (no RPC needed, single-row writes). Two new lookup tables (`personas`, `categorias_gasto`) are seeded via migration with no admin UI, mirroring how `categorias` already works. Filtering is done in-memory on the client via a pure, unit-tested function (`filtrarGastos`), fed by a client component that owns filter state and composes the filter bar + table.

**Tech Stack:** Next.js App Router, Supabase (Postgres), shadcn/ui (`Calendar`/`Popover` — new additions — plus `Select`, `Dialog`, `AlertDialog`, `Form`, `Badge`, `Button`, `Input`, already installed), React Hook Form + Zod, TanStack Table via the existing `DataTable`.

## Global Constraints

- Currency is ARS only. Categoría is optional (nullable FK); nombre, persona, monto are required. `monto` must be `> 0`.
- `personas` and `categorias_gasto` are seeded via migration, no admin UI in this iteration. Seed data: personas = "Mauricio Martinez", "Jeremias Aruta"; categorias_gasto (nombre → color token) = Insumos/stock→blue, Envíos→cyan, Comisiones ML→amber, Publicidad→violet, Embalaje→orange, Herramientas/software→emerald, Otros→slate.
- Filters are selector-only (no free-text search): persona (select), categoría (select), campo de fecha creado/actualizado (select) + rango desde-hasta (date range picker). Filtering happens **client-side in memory** — the page fetches the full gasto list once; no query params, no server round-trip per filter change.
- `updated_at` is set explicitly by `gastosService.actualizar()` (`new Date().toISOString()`), not a Postgres trigger — consistent with the rest of this codebase, which uses no triggers.
- Automated tests cover only pure logic (services, Zod-adjacent validation via actions, `filtrarGastos`) — same scope as the rest of this project. No UI component tests.
- **Design system compliance (`docs/DESIGN_SYSTEM.md`, obligatorio):** this plan applies the design system's rules **only to the new gastos-specific files** — page header pattern (h1 `text-2xl font-semibold tracking-tight` + subtitle), badge technique (`bg-{color}-50 text-{color}-700 dark:bg-{color}-950 dark:text-{color}-300`), and a filter bar above the table with a record counter on the right. It explicitly does **not** touch `globals.css` (font/primary color/sidebar theme), `layout.tsx`, or re-theme `proveedores`/`productos` — that global rebrand was deliberately deferred to a separate task (confirmed with the user). The one shared-component touch is additive and non-breaking: `DataTable` gets an optional `className` prop (defaults to today's exact styling) so gastos can opt into `rounded-lg border bg-card` without changing how proveedores/productos render.
- No login/auth (same private-link model as the rest of the app). TypeScript strict, no `any`, no `@ts-ignore`. Only shadcn/ui components for interactive UI elements.
- Sidebar gets exactly one new item: "Gastos" → `/gastos`, same active-highlighting pattern as the existing items.

---

### Task 1: Supabase schema for gastos

**Files:**
- Create: `supabase/migrations/20260726120000_gastos_schema.sql`

**Interfaces:**
- Produces: tables `public.personas(id, nombre)`, `public.categorias_gasto(id, nombre, color)`, `public.gastos(id, nombre, persona_id, categoria_id, monto, created_at, updated_at)` — consumed by Task 3/4/6's services.

- [ ] **Step 1: Write the migration file**

```sql
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table public.categorias_gasto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  color text not null
);

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  persona_id uuid not null references public.personas(id),
  categoria_id uuid references public.categorias_gasto(id) on delete set null,
  monto numeric not null check (monto > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personas enable row level security;
alter table public.categorias_gasto enable row level security;
alter table public.gastos enable row level security;

insert into public.personas (nombre) values
  ('Mauricio Martinez'), ('Jeremias Aruta');

insert into public.categorias_gasto (nombre, color) values
  ('Insumos/stock', 'blue'),
  ('Envíos', 'cyan'),
  ('Comisiones ML', 'amber'),
  ('Publicidad', 'violet'),
  ('Embalaje', 'orange'),
  ('Herramientas/software', 'emerald'),
  ('Otros', 'slate');
```

No RLS policies are created — same intentional default-deny pattern as every other table in this project (only the server-side secret key, which bypasses RLS, ever touches these tables).

- [ ] **Step 2: Apply the migration via the Supabase MCP tool**

Call `mcp__plugin_supabase_supabase__apply_migration` with `project_id: "vngsqjzlmqcpxlxtkbel"`, `name: "gastos_schema"`, and the SQL from Step 1 as `query`.

Expected: tool returns success.

- [ ] **Step 3: Verify the schema**

Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "vngsqjzlmqcpxlxtkbel"` and a query that confirms all three tables exist with the right columns/constraints (e.g. selecting from `information_schema.columns` for `table_name in ('personas', 'categorias_gasto', 'gastos')`, and checking `pg_constraint`/`pg_policies` for the FKs, the `monto > 0` check, and RLS state). Also run `select nombre from public.personas order by nombre;` and `select nombre, color from public.categorias_gasto order by nombre;` to confirm the seed rows landed correctly (2 personas, 7 categorías).

- [ ] **Step 4: Run the security advisor**

Call `mcp__plugin_supabase_supabase__get_advisors` with `project_id: "vngsqjzlmqcpxlxtkbel"`, `type: "security"`. Expected: only the now-expected INFO-level `rls_enabled_no_policy` findings (the pre-existing ones plus these 3 new tables), no ERROR/WARN.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add supabase/migrations/20260726120000_gastos_schema.sql
git commit -m "feat(db): create gastos schema"
```

---

### Task 2: Domain types and badge color utility

**Files:**
- Create: `src/types/gasto.ts`
- Create: `src/lib/badgeColors.ts`

**Interfaces:**
- Produces: `ColorToken`, `Persona`, `CategoriaGasto`, `Gasto`, `GastoInput`, `CampoFechaGasto`, `FiltrosGasto` from `@/types/gasto` — consumed by every later task.
- Produces: `badgeColorClasses(token: ColorToken): string` from `@/lib/badgeColors` — consumed by Task 10's `columnas-gastos.tsx`.

- [ ] **Step 1: Write `src/types/gasto.ts`**

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

export type Persona = {
  id: string;
  nombre: string;
};

export type CategoriaGasto = {
  id: string;
  nombre: string;
  color: ColorToken;
};

export type Gasto = {
  id: string;
  nombre: string;
  personaId: string;
  categoriaId: string | null;
  monto: number;
  createdAt: string;
  updatedAt: string;
};

export type GastoInput = {
  nombre: string;
  personaId: string;
  categoriaId: string | null;
  monto: number;
};

export type CampoFechaGasto = 'created_at' | 'updated_at';

export type FiltrosGasto = {
  personaId: string | null;
  categoriaId: string | null;
  campoFecha: CampoFechaGasto;
  desde: string | null;
  hasta: string | null;
};
```

- [ ] **Step 2: Write `src/lib/badgeColors.ts`**

Uses the exact technique from `docs/DESIGN_SYSTEM.md` section 3 (soft background, dark-toned text, saturated dark-mode variant). `slate` uses stronger tones (`100`/`800` instead of `50`/`950`) because `slate-50`/`slate-950` are too close to the light/dark page background to read as a badge.

```ts
import type { ColorToken } from '@/types/gasto';

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

- [ ] **Step 3: Type-check and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx tsc --noEmit
git add src/types/gasto.ts src/lib/badgeColors.ts
git commit -m "feat: add gasto domain types and badge color utility"
```

Expected: `tsc` passes with no errors (both files are self-contained, nothing consumes them yet).

---

### Task 3: personasService (TDD)

**Files:**
- Create: `src/lib/services/personasService.ts`
- Test: `src/lib/services/personasService.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` from `@/lib/supabase/server`, `throwOnSupabaseError` from `@/lib/services/supabaseError`, `Persona` from `@/types/gasto`, `createQueryMock` from `@/lib/services/testUtils/supabaseQueryMock`.
- Produces: `personasService.listar(): Promise<Persona[]>` — consumed by Task 12's `page.tsx`.

- [ ] **Step 1: Write the failing test**

`src/lib/services/personasService.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { personasService } from './personasService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

describe('personasService.listar', () => {
  it('devuelve las personas ordenadas por nombre', async () => {
    const queryMock = createQueryMock({
      data: [
        { id: '1', nombre: 'Jeremias Aruta' },
        { id: '2', nombre: 'Mauricio Martinez' },
      ],
      error: null,
    });
    const from = vi.fn().mockReturnValue(queryMock);
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const result = await personasService.listar();

    expect(from).toHaveBeenCalledWith('personas');
    expect(queryMock.select).toHaveBeenCalledWith('id, nombre');
    expect(queryMock.order).toHaveBeenCalledWith('nombre');
    expect(result).toEqual([
      { id: '1', nombre: 'Jeremias Aruta' },
      { id: '2', nombre: 'Mauricio Martinez' },
    ]);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    await expect(personasService.listar()).rejects.toThrow('No se pudieron cargar las personas: timeout');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- personasService`
Expected: FAIL — `personasService.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

`src/lib/services/personasService.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { Persona } from '@/types/gasto';

export const personasService = {
  async listar(): Promise<Persona[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('personas').select('id, nombre').order('nombre');

    throwOnSupabaseError(error, 'No se pudieron cargar las personas');
    return data as Persona[];
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- personasService`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add src/lib/services/personasService.ts src/lib/services/personasService.test.ts
git commit -m "feat: add personasService"
```

---

### Task 4: categoriasGastoService (TDD)

**Files:**
- Create: `src/lib/services/categoriasGastoService.ts`
- Test: `src/lib/services/categoriasGastoService.test.ts`

**Interfaces:**
- Consumes: same shared infra as Task 3, plus `CategoriaGasto` from `@/types/gasto`.
- Produces: `categoriasGastoService.listar(): Promise<CategoriaGasto[]>` — consumed by Task 12's `page.tsx`.

- [ ] **Step 1: Write the failing test**

`src/lib/services/categoriasGastoService.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { categoriasGastoService } from './categoriasGastoService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

describe('categoriasGastoService.listar', () => {
  it('devuelve las categorías de gasto ordenadas por nombre', async () => {
    const queryMock = createQueryMock({
      data: [
        { id: '1', nombre: 'Envíos', color: 'cyan' },
        { id: '2', nombre: 'Insumos/stock', color: 'blue' },
      ],
      error: null,
    });
    const from = vi.fn().mockReturnValue(queryMock);
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const result = await categoriasGastoService.listar();

    expect(from).toHaveBeenCalledWith('categorias_gasto');
    expect(queryMock.select).toHaveBeenCalledWith('id, nombre, color');
    expect(queryMock.order).toHaveBeenCalledWith('nombre');
    expect(result).toEqual([
      { id: '1', nombre: 'Envíos', color: 'cyan' },
      { id: '2', nombre: 'Insumos/stock', color: 'blue' },
    ]);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    await expect(categoriasGastoService.listar()).rejects.toThrow(
      'No se pudieron cargar las categorías de gasto: timeout'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- categoriasGastoService`
Expected: FAIL — `categoriasGastoService.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

`src/lib/services/categoriasGastoService.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { CategoriaGasto } from '@/types/gasto';

export const categoriasGastoService = {
  async listar(): Promise<CategoriaGasto[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('categorias_gasto')
      .select('id, nombre, color')
      .order('nombre');

    throwOnSupabaseError(error, 'No se pudieron cargar las categorías de gasto');
    return data as CategoriaGasto[];
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- categoriasGastoService`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add src/lib/services/categoriasGastoService.ts src/lib/services/categoriasGastoService.test.ts
git commit -m "feat: add categoriasGastoService"
```

---

### Task 5: gastoSchema (Zod validation)

**Files:**
- Create: `src/lib/validation/gastoSchema.ts`

**Interfaces:**
- Produces: `gastoSchema`, `GastoFormValues` — consumed by Task 8's actions and Task 10's `formulario-gasto.tsx`.

No dedicated test file — matches the `productoSchema` precedent (no security-sensitive validation like the URL-scheme check `proveedorSchema` has; the schema's correctness is exercised indirectly through Task 8's action tests).

- [ ] **Step 1: Write `src/lib/validation/gastoSchema.ts`**

```ts
import { z } from 'zod';

export const gastoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  personaId: z.string().min(1, 'Seleccioná quién gastó'),
  categoriaId: z.string().nullable(),
  monto: z.coerce.number().positive('El monto debe ser mayor a cero'),
});

export type GastoFormValues = z.infer<typeof gastoSchema>;
```

- [ ] **Step 2: Type-check and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx tsc --noEmit
git add src/lib/validation/gastoSchema.ts
git commit -m "feat: add gastoSchema validation"
```

---

### Task 6: gastosService with filters (TDD)

**Files:**
- Modify: `src/lib/services/testUtils/supabaseQueryMock.ts`
- Create: `src/lib/services/gastosService.ts`
- Test: `src/lib/services/gastosService.test.ts`

**Interfaces:**
- Consumes: `FiltrosGasto`, `Gasto`, `GastoInput`, `CampoFechaGasto` from `@/types/gasto`.
- Produces: `gastosService.listar(filtros?: Partial<FiltrosGasto>): Promise<Gasto[]>`, `.crear(input: GastoInput): Promise<Gasto>`, `.actualizar(id: string, input: GastoInput): Promise<Gasto>`, `.eliminar(id: string): Promise<void>` — consumed by Task 8's actions and Task 12's `page.tsx`.

- [ ] **Step 1: Extend the shared Supabase query mock with `gte`/`lte`**

The current mock only chains `select`/`insert`/`update`/`delete`/`eq`/`order`. `gastosService.listar` needs `gte`/`lte` for the date-range filter. This change is additive — existing tests that don't call `gte`/`lte` are unaffected.

Modify `src/lib/services/testUtils/supabaseQueryMock.ts`:

```ts
import { vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown; count?: number | null };

export function createQueryMock(result: QueryResult) {
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order'];
  const mock: Record<string, unknown> = {};

  chainMethods.forEach((method) => {
    mock[method] = vi.fn().mockReturnValue(mock);
  });

  mock.single = vi.fn().mockResolvedValue(result);
  mock.then = (resolve: (value: QueryResult) => unknown) => resolve(result);

  return mock;
}
```

- [ ] **Step 2: Run the existing suite to confirm this change is non-breaking**

Run: `npm run test`
Expected: all previously-passing tests still PASS (this file has no test of its own; it's exercised transitively by every `*Service.test.ts`).

- [ ] **Step 3: Write the failing test for gastosService**

`src/lib/services/gastosService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gastosService } from './gastosService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

const mockedCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;

const gastoRow = {
  id: 'g1',
  nombre: 'Compra de cajas',
  persona_id: 'per1',
  categoria_id: 'cat1',
  monto: 5000,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-02T00:00:00.000Z',
};

const gastoEsperado = {
  id: 'g1',
  nombre: 'Compra de cajas',
  personaId: 'per1',
  categoriaId: 'cat1',
  monto: 5000,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
};

describe('gastosService', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  describe('listar', () => {
    it('devuelve todos los gastos sin filtros', async () => {
      const queryMock = createQueryMock({ data: [gastoRow], error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      const result = await gastosService.listar();

      expect(from).toHaveBeenCalledWith('gastos');
      expect(queryMock.eq).not.toHaveBeenCalled();
      expect(queryMock.gte).not.toHaveBeenCalled();
      expect(queryMock.lte).not.toHaveBeenCalled();
      expect(result).toEqual([gastoEsperado]);
    });

    it('filtra por persona y categoría cuando se pasan', async () => {
      const queryMock = createQueryMock({ data: [gastoRow], error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      await gastosService.listar({ personaId: 'per1', categoriaId: 'cat1' });

      expect(queryMock.eq).toHaveBeenCalledWith('persona_id', 'per1');
      expect(queryMock.eq).toHaveBeenCalledWith('categoria_id', 'cat1');
    });

    it('filtra por rango de fechas usando el campo indicado', async () => {
      const queryMock = createQueryMock({ data: [gastoRow], error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      await gastosService.listar({ campoFecha: 'updated_at', desde: '2026-07-01', hasta: '2026-07-31' });

      expect(queryMock.gte).toHaveBeenCalledWith('updated_at', '2026-07-01');
      expect(queryMock.lte).toHaveBeenCalledWith('updated_at', '2026-07-31');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(gastosService.listar()).rejects.toThrow('No se pudieron cargar los gastos: timeout');
    });
  });

  describe('crear', () => {
    it('inserta el gasto y devuelve el registro mapeado', async () => {
      const queryMock = createQueryMock({ data: gastoRow, error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      const result = await gastosService.crear({
        nombre: 'Compra de cajas',
        personaId: 'per1',
        categoriaId: 'cat1',
        monto: 5000,
      });

      expect(from).toHaveBeenCalledWith('gastos');
      expect(queryMock.insert).toHaveBeenCalledWith({
        nombre: 'Compra de cajas',
        persona_id: 'per1',
        categoria_id: 'cat1',
        monto: 5000,
      });
      expect(result).toEqual(gastoEsperado);
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(
        gastosService.crear({ nombre: 'Compra de cajas', personaId: 'per1', categoriaId: 'cat1', monto: 5000 })
      ).rejects.toThrow('No se pudo crear el gasto: fk violation');
    });
  });

  describe('actualizar', () => {
    it('actualiza el gasto seteando updated_at y devuelve el registro mapeado', async () => {
      const queryMock = createQueryMock({ data: gastoRow, error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      const result = await gastosService.actualizar('g1', {
        nombre: 'Compra de cajas',
        personaId: 'per1',
        categoriaId: 'cat1',
        monto: 5000,
      });

      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Compra de cajas',
          persona_id: 'per1',
          categoria_id: 'cat1',
          monto: 5000,
          updated_at: expect.any(String),
        })
      );
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'g1');
      expect(result).toEqual(gastoEsperado);
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(
        gastosService.actualizar('g1', { nombre: 'x', personaId: 'per1', categoriaId: null, monto: 1 })
      ).rejects.toThrow('No se pudo actualizar el gasto: fk violation');
    });
  });

  describe('eliminar', () => {
    it('elimina el gasto por id', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 1 }));
      mockedCreateClient.mockReturnValue({ from });

      await gastosService.eliminar('g1');

      expect(from).toHaveBeenCalledWith('gastos');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({ data: null, error: { message: 'fk violation' }, count: null })
      );
      mockedCreateClient.mockReturnValue({ from });

      await expect(gastosService.eliminar('g1')).rejects.toThrow('No se pudo eliminar el gasto: fk violation');
    });

    it('lanza un error legible si el gasto ya no existe', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 0 }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(gastosService.eliminar('g1')).rejects.toThrow(
        'El gasto ya no existe (probablemente ya fue eliminado por otra persona).'
      );
    });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- gastosService`
Expected: FAIL — `gastosService.ts` does not exist yet.

- [ ] **Step 5: Write the implementation**

`src/lib/services/gastosService.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { CampoFechaGasto, FiltrosGasto, Gasto, GastoInput } from '@/types/gasto';

type GastoRow = {
  id: string;
  nombre: string;
  persona_id: string;
  categoria_id: string | null;
  monto: number;
  created_at: string;
  updated_at: string;
};

const SELECT_COLUMNAS = 'id, nombre, persona_id, categoria_id, monto, created_at, updated_at';

function mapRow(row: GastoRow): Gasto {
  return {
    id: row.id,
    nombre: row.nombre,
    personaId: row.persona_id,
    categoriaId: row.categoria_id,
    monto: row.monto,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: GastoInput) {
  return {
    nombre: input.nombre,
    persona_id: input.personaId,
    categoria_id: input.categoriaId,
    monto: input.monto,
  };
}

export const gastosService = {
  async listar(filtros?: Partial<FiltrosGasto>): Promise<Gasto[]> {
    const supabase = createSupabaseServerClient();
    let query = supabase.from('gastos').select(SELECT_COLUMNAS);

    if (filtros?.personaId) {
      query = query.eq('persona_id', filtros.personaId);
    }
    if (filtros?.categoriaId) {
      query = query.eq('categoria_id', filtros.categoriaId);
    }
    const campoFecha: CampoFechaGasto = filtros?.campoFecha ?? 'created_at';
    if (filtros?.desde) {
      query = query.gte(campoFecha, filtros.desde);
    }
    if (filtros?.hasta) {
      query = query.lte(campoFecha, filtros.hasta);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    throwOnSupabaseError(error, 'No se pudieron cargar los gastos');
    return (data as GastoRow[]).map(mapRow);
  },

  async crear(input: GastoInput): Promise<Gasto> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('gastos')
      .insert(toRow(input))
      .select(SELECT_COLUMNAS)
      .single();

    throwOnSupabaseError(error, 'No se pudo crear el gasto');
    return mapRow(data as GastoRow);
  },

  async actualizar(id: string, input: GastoInput): Promise<Gasto> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('gastos')
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT_COLUMNAS)
      .single();

    throwOnSupabaseError(error, 'No se pudo actualizar el gasto');
    return mapRow(data as GastoRow);
  },

  async eliminar(id: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error, count } = await supabase
      .from('gastos')
      .delete({ count: 'exact' })
      .eq('id', id);

    throwOnSupabaseError(error, 'No se pudo eliminar el gasto');
    if (count === 0) {
      throw new Error('El gasto ya no existe (probablemente ya fue eliminado por otra persona).');
    }
  },
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- gastosService`
Expected: PASS (11 tests)

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add src/lib/services/testUtils/supabaseQueryMock.ts src/lib/services/gastosService.ts src/lib/services/gastosService.test.ts
git commit -m "feat: add gastosService with persona/categoria/fecha filters"
```

---

### Task 7: filtrarGastos (pure filtering logic, TDD)

**Files:**
- Create: `src/lib/filtrarGastos.ts`
- Test: `src/lib/filtrarGastos.test.ts`

**Interfaces:**
- Consumes: `FiltrosGasto`, `Gasto` from `@/types/gasto`.
- Produces: `filtrarGastos(gastos: Gasto[], filtros: FiltrosGasto): Gasto[]` — consumed by Task 12's `listado-gastos.tsx`.

This is the client-side filtering logic described in the spec. Date bounds use `Date` comparison (not string comparison) so a same-day timestamp is correctly included at the upper bound — e.g. `hasta: '2026-07-20'` must still include a gasto created at `2026-07-20T23:59:00Z`.

- [ ] **Step 1: Write the failing test**

`src/lib/filtrarGastos.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filtrarGastos } from './filtrarGastos';
import type { FiltrosGasto, Gasto } from '@/types/gasto';

const FILTROS_BASE: FiltrosGasto = {
  personaId: null,
  categoriaId: null,
  campoFecha: 'created_at',
  desde: null,
  hasta: null,
};

const gastos: Gasto[] = [
  {
    id: 'g1',
    nombre: 'Compra de cajas',
    personaId: 'per1',
    categoriaId: 'cat1',
    monto: 1000,
    createdAt: '2026-07-05T10:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
  },
  {
    id: 'g2',
    nombre: 'Envío MercadoLibre',
    personaId: 'per2',
    categoriaId: 'cat2',
    monto: 2000,
    createdAt: '2026-07-20T23:30:00.000Z',
    updatedAt: '2026-07-20T23:30:00.000Z',
  },
];

describe('filtrarGastos', () => {
  it('devuelve todos los gastos si no hay filtros activos', () => {
    expect(filtrarGastos(gastos, FILTROS_BASE)).toEqual(gastos);
  });

  it('filtra por persona', () => {
    expect(filtrarGastos(gastos, { ...FILTROS_BASE, personaId: 'per1' })).toEqual([gastos[0]]);
  });

  it('filtra por categoría', () => {
    expect(filtrarGastos(gastos, { ...FILTROS_BASE, categoriaId: 'cat2' })).toEqual([gastos[1]]);
  });

  it('filtra por rango de fechas usando created_at', () => {
    const resultado = filtrarGastos(gastos, { ...FILTROS_BASE, desde: '2026-07-15', hasta: '2026-07-25' });
    expect(resultado).toEqual([gastos[1]]);
  });

  it('filtra por rango de fechas usando updated_at cuando se indica ese campo', () => {
    const resultado = filtrarGastos(gastos, {
      ...FILTROS_BASE,
      campoFecha: 'updated_at',
      desde: '2026-07-01',
      hasta: '2026-07-11',
    });
    expect(resultado).toEqual([gastos[0]]);
  });

  it('incluye gastos del último día del rango (límite superior inclusivo pese al horario)', () => {
    const resultado = filtrarGastos(gastos, { ...FILTROS_BASE, desde: '2026-07-20', hasta: '2026-07-20' });
    expect(resultado).toEqual([gastos[1]]);
  });

  it('combina varios filtros a la vez', () => {
    const resultado = filtrarGastos(gastos, {
      ...FILTROS_BASE,
      personaId: 'per1',
      categoriaId: 'cat1',
      desde: '2026-07-01',
      hasta: '2026-07-10',
    });
    expect(resultado).toEqual([gastos[0]]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- filtrarGastos`
Expected: FAIL — `filtrarGastos.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

`src/lib/filtrarGastos.ts`:

```ts
import type { FiltrosGasto, Gasto } from '@/types/gasto';

export function filtrarGastos(gastos: Gasto[], filtros: FiltrosGasto): Gasto[] {
  return gastos.filter((gasto) => {
    if (filtros.personaId && gasto.personaId !== filtros.personaId) return false;
    if (filtros.categoriaId && gasto.categoriaId !== filtros.categoriaId) return false;

    const valorFecha = new Date(filtros.campoFecha === 'updated_at' ? gasto.updatedAt : gasto.createdAt);

    if (filtros.desde && valorFecha < new Date(filtros.desde)) return false;

    if (filtros.hasta) {
      const finDelDia = new Date(filtros.hasta);
      finDelDia.setHours(23, 59, 59, 999);
      if (valorFecha > finDelDia) return false;
    }

    return true;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- filtrarGastos`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add src/lib/filtrarGastos.ts src/lib/filtrarGastos.test.ts
git commit -m "feat: add filtrarGastos client-side filtering logic"
```

---

### Task 8: Server Actions for gastos (TDD)

**Files:**
- Create: `src/app/gastos/actions.ts`
- Test: `src/app/gastos/actions.test.ts`

**Interfaces:**
- Consumes: `gastosService` from Task 6, `gastoSchema` from Task 5, `ActionResult`/`toActionResult` from `@/lib/actionResult`.
- Produces: `crearGastoAction(input: unknown): Promise<ActionResult>`, `actualizarGastoAction(id: string, input: unknown): Promise<ActionResult>`, `eliminarGastoAction(id: string): Promise<ActionResult>` — consumed by Task 10's `formulario-gasto.tsx`/`boton-eliminar-gasto.tsx`.

- [ ] **Step 1: Write the failing test**

`src/app/gastos/actions.test.ts` (mirrors `src/app/proveedores/actions.test.ts`, which only covers `crear`):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/services/gastosService', () => ({
  gastosService: {
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { crearGastoAction } from './actions';
import { gastosService } from '@/lib/services/gastosService';
import { revalidatePath } from 'next/cache';

const mockedCrear = gastosService.crear as ReturnType<typeof vi.fn>;
const mockedRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>;

const gastoValido = {
  nombre: 'Compra de cajas',
  personaId: 'per1',
  categoriaId: 'cat1',
  monto: 5000,
};

describe('crearGastoAction', () => {
  beforeEach(() => {
    mockedCrear.mockReset();
    mockedRevalidatePath.mockReset();
  });

  it('devuelve un error legible en lugar de lanzar cuando la validación falla', async () => {
    const result = await crearGastoAction({ ...gastoValido, nombre: '' });

    expect(result).toEqual({ success: false, error: 'El nombre es obligatorio' });
    expect(mockedCrear).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it('devuelve success y revalida la ruta cuando el input es válido y el servicio no falla', async () => {
    mockedCrear.mockResolvedValue({
      id: 'g1',
      ...gastoValido,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    const result = await crearGastoAction(gastoValido);

    expect(result).toEqual({ success: true });
    expect(mockedCrear).toHaveBeenCalledWith(gastoValido);
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/gastos');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- gastos/actions`
Expected: FAIL — `src/app/gastos/actions.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

`src/app/gastos/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { toActionResult, type ActionResult } from '@/lib/actionResult';
import { gastosService } from '@/lib/services/gastosService';
import { gastoSchema } from '@/lib/validation/gastoSchema';

export async function crearGastoAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = gastoSchema.parse(input);
    await gastosService.crear(parsed);
    revalidatePath('/gastos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function actualizarGastoAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = gastoSchema.parse(input);
    await gastosService.actualizar(id, parsed);
    revalidatePath('/gastos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function eliminarGastoAction(id: string): Promise<ActionResult> {
  try {
    await gastosService.eliminar(id);
    revalidatePath('/gastos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- gastos/actions`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add src/app/gastos/actions.ts src/app/gastos/actions.test.ts
git commit -m "feat: add gastos Server Actions"
```

---

### Task 9: Add shadcn `calendar` and `popover` components

**Files:**
- Create: `src/components/ui/calendar.tsx`
- Create: `src/components/ui/popover.tsx`
- Modify: `package.json`, `package-lock.json` (adds `react-day-picker@^10.0.1`, `date-fns@^4.4.0`)

**Interfaces:**
- Produces: `Calendar` (wraps `react-day-picker`'s `DayPicker`, accepts standard `DayPicker` props: `mode`, `selected`, `onSelect`, `numberOfMonths`, etc.) from `@/components/ui/calendar`; `Popover`/`PopoverTrigger`/`PopoverContent` from `@/components/ui/popover` — consumed by Task 12's `filtros-gastos.tsx`.
- Also produces the type `DateRange = { from: Date | undefined; to?: Date | undefined }` from the `react-day-picker` package itself (not re-exported by `calendar.tsx` — import it directly: `import type { DateRange } from 'react-day-picker'`).

This step was already run once during planning to confirm the generated API against this project's shadcn registry (`"style": "radix-nova"` in `components.json`, non-default) and then reverted — the command below reproduces the exact same result.

- [ ] **Step 1: Run the shadcn CLI**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx shadcn add calendar popover --yes
```

Expected output: `Created 2 files: src/components/ui/popover.tsx, src/components/ui/calendar.tsx` (it will also report `Skipped 1 file: src/components/ui/button.tsx` — that's expected, decline any overwrite since `button.tsx` is unrelated to this change).

- [ ] **Step 2: Verify the build still compiles**

```bash
npm run build
```

Expected: build succeeds (these two files aren't imported anywhere yet, so this just confirms no syntax/type errors in the generated code and that the new dependencies installed correctly).

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add package.json package-lock.json src/components/ui/calendar.tsx src/components/ui/popover.tsx
git commit -m "chore: add shadcn calendar and popover components"
```

---

### Task 10: Gasto form, delete button, and table columns

**Files:**
- Create: `src/components/gastos/formulario-gasto.tsx`
- Create: `src/components/gastos/boton-eliminar-gasto.tsx`
- Create: `src/components/gastos/columnas-gastos.tsx`

**Interfaces:**
- Consumes: `gastoSchema`/`GastoFormValues` (Task 5), `crearGastoAction`/`actualizarGastoAction`/`eliminarGastoAction` (Task 8), `handleActionResult` from `@/lib/handleActionResult`, `badgeColorClasses` (Task 2), `Gasto`/`GastoInput`/`Persona`/`CategoriaGasto`/`ColorToken` (Task 2).
- Produces: `FormularioGasto` (props: `personas`, `categorias`, `gasto?`, `trigger?`, `open?`, `onOpenChange?`), `BotonEliminarGasto` (props: `gastoId`, `gastoNombre`), `crearColumnas({ personas, categorias }): ColumnDef<Gasto>[]` — all consumed by Task 12's `tabla-gastos.tsx`.

No automated tests for this task — matches the agreed scope (UI components aren't unit-tested in this project). Verify manually via `npm run build` (type-checks JSX/props) after each file.

- [ ] **Step 1: Write `src/components/gastos/formulario-gasto.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { gastoSchema, type GastoFormValues } from '@/lib/validation/gastoSchema';
import { crearGastoAction, actualizarGastoAction } from '@/app/gastos/actions';
import { handleActionResult } from '@/lib/handleActionResult';
import type { CategoriaGasto, Gasto, Persona } from '@/types/gasto';

const SIN_CATEGORIA = 'sin-categoria';

type GastoFormInput = z.input<typeof gastoSchema>;

type FormularioGastoProps = {
  personas: Persona[];
  categorias: CategoriaGasto[];
  gasto?: Gasto;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function buildDefaultValues(gasto?: Gasto): GastoFormInput {
  if (gasto) {
    return {
      nombre: gasto.nombre,
      personaId: gasto.personaId,
      categoriaId: gasto.categoriaId,
      monto: gasto.monto,
    };
  }

  return {
    nombre: '',
    personaId: '',
    categoriaId: null,
    monto: 0,
  };
}

export function FormularioGasto({
  personas,
  categorias,
  gasto,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: FormularioGastoProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const form = useForm<GastoFormInput, unknown, GastoFormValues>({
    resolver: zodResolver(gastoSchema),
    defaultValues: buildDefaultValues(gasto),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(gasto));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: GastoFormValues) {
    const result = gasto ? await actualizarGastoAction(gasto.id, values) : await crearGastoAction(values);

    if (!handleActionResult(result, gasto ? 'Gasto actualizado' : 'Gasto creado')) {
      return;
    }

    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{gasto ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
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
              name="personaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quién gastó</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná quién gastó" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select
                    value={field.value ?? SIN_CATEGORIA}
                    onValueChange={(value) => field.onChange(value === SIN_CATEGORIA ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sin categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SIN_CATEGORIA}>Sin categoría</SelectItem>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto (ARS)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{gasto ? 'Guardar cambios' : 'Crear gasto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write `src/components/gastos/boton-eliminar-gasto.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { eliminarGastoAction } from '@/app/gastos/actions';
import { handleActionResult } from '@/lib/handleActionResult';

type BotonEliminarGastoProps = {
  gastoId: string;
  gastoNombre: string;
};

export function BotonEliminarGasto({ gastoId, gastoNombre }: BotonEliminarGastoProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await eliminarGastoAction(gastoId);
      handleActionResult(result, 'Gasto eliminado');
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará &quot;{gastoNombre}&quot;. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Write `src/components/gastos/columnas-gastos.tsx`**

Badges use `variant="outline"` as the base (transparent background, no solid `bg-primary`) so the `badgeColorClasses` override wins cleanly via `cn`/`tailwind-merge`. Persona colors are fixed in code (only 2 people, not dynamic, per the approved spec) rather than stored in the database like category colors are.

```tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BotonEliminarGasto } from '@/components/gastos/boton-eliminar-gasto';
import { FormularioGasto } from '@/components/gastos/formulario-gasto';
import { badgeColorClasses } from '@/lib/badgeColors';
import { cn } from '@/lib/utils';
import type { CategoriaGasto, ColorToken, Gasto, Persona } from '@/types/gasto';

const COLOR_POR_PERSONA: Record<string, ColorToken> = {
  'Mauricio Martinez': 'indigo',
  'Jeremias Aruta': 'fuchsia',
};

const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

type CrearColumnasParams = {
  personas: Persona[];
  categorias: CategoriaGasto[];
};

export function crearColumnas({ personas, categorias }: CrearColumnasParams): ColumnDef<Gasto>[] {
  const personaPorId = new Map(personas.map((p) => [p.id, p]));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));

  return [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      id: 'persona',
      header: 'Quién gastó',
      cell: ({ row }) => {
        const persona = personaPorId.get(row.original.personaId);
        if (!persona) return '—';
        const color = COLOR_POR_PERSONA[persona.nombre] ?? 'slate';
        return (
          <Badge variant="outline" className={cn(badgeColorClasses(color))}>
            {persona.nombre}
          </Badge>
        );
      },
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
    {
      id: 'monto',
      header: 'Monto',
      cell: ({ row }) => FORMATO_MONEDA.format(row.original.monto),
    },
    {
      id: 'createdAt',
      header: 'Creado',
      cell: ({ row }) => formatearFecha(row.original.createdAt),
    },
    {
      id: 'updatedAt',
      header: 'Actualizado',
      cell: ({ row }) => formatearFecha(row.original.updatedAt),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <FormularioGasto
            personas={personas}
            categorias={categorias}
            gasto={row.original}
            trigger={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
          <BotonEliminarGasto gastoId={row.original.id} gastoNombre={row.original.nombre} />
        </div>
      ),
    },
  ];
}
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx tsc --noEmit
```

Expected: PASS (these files aren't imported anywhere yet — `tsc --noEmit` still type-checks them standalone since they're part of the TS project; there's no dead-code exclusion).

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add src/components/gastos/formulario-gasto.tsx src/components/gastos/boton-eliminar-gasto.tsx src/components/gastos/columnas-gastos.tsx
git commit -m "feat: add gasto form, delete button, and table columns"
```

---

### Task 11: Table, filter bar, page, and sidebar entry

**Files:**
- Modify: `src/components/ui/data-table.tsx` (additive `className` prop, default unchanged)
- Create: `src/components/gastos/tabla-gastos.tsx`
- Create: `src/components/gastos/filtros-gastos.tsx`
- Create: `src/components/gastos/listado-gastos.tsx`
- Create: `src/app/gastos/page.tsx`
- Create: `src/app/gastos/loading.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

**Interfaces:**
- Consumes: `crearColumnas` (Task 10), `filtrarGastos` (Task 7), `gastosService`/`personasService`/`categoriasGastoService` (Tasks 3/4/6), `Calendar`/`Popover*` (Task 9), `FormularioGasto` (Task 10).
- Produces: the `/gastos` route.

No automated tests — UI composition, same agreed scope as Task 10.

- [ ] **Step 1: Add an optional `className` to `DataTable`'s wrapper (non-breaking)**

Modify `src/components/ui/data-table.tsx` — add `className?: string` to the props type and merge it onto the existing wrapper div via `cn`. When the prop is omitted (every current caller: `TablaProveedores`, `TablaProductos`), the rendered className is byte-identical to today (`cn('rounded-md border', undefined)` === `'rounded-md border'`), so proveedores/productos are visually unaffected.

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
import { cn } from '@/lib/utils';

type DataTableProps<TData extends { id: string }, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  className?: string;
};

export function DataTable<TData extends { id: string }, TValue>({
  columns,
  data,
  emptyMessage = 'Sin resultados',
  onRowClick,
  className,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className={cn('rounded-md border', className)}>
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
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={onRowClick ? 'cursor-pointer' : undefined}
              >
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

- [ ] **Step 2: Write `src/components/gastos/tabla-gastos.tsx`**

Unlike `TablaProductos`/`TablaProveedores`, there's no row-click detail dialog (not in scope — see the approved spec) — editing happens via the inline "Editar" button in the acciones column, so this component stays a thin wrapper. Uses `rounded-lg border bg-card` per `docs/DESIGN_SYSTEM.md` section 5.

```tsx
'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { crearColumnas } from '@/components/gastos/columnas-gastos';
import type { CategoriaGasto, Gasto, Persona } from '@/types/gasto';

type TablaGastosProps = {
  gastos: Gasto[];
  personas: Persona[];
  categorias: CategoriaGasto[];
};

export function TablaGastos({ gastos, personas, categorias }: TablaGastosProps) {
  const columns = useMemo(() => crearColumnas({ personas, categorias }), [personas, categorias]);

  return (
    <DataTable
      columns={columns}
      data={gastos}
      emptyMessage="No hay gastos cargados"
      className="rounded-lg border bg-card"
    />
  );
}
```

- [ ] **Step 3: Write `src/components/gastos/filtros-gastos.tsx`**

Uses the real `Calendar`/`Popover` API confirmed in Task 9 (`mode="range"`, `selected: DateRange`, `onSelect`, `numberOfMonths`). Dates are stored in `FiltrosGasto` as `YYYY-MM-DD` strings (`date.toISOString().slice(0, 10)`), which `filtrarGastos` (Task 7) already expects.

```tsx
'use client';

import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CampoFechaGasto, CategoriaGasto, FiltrosGasto, Persona } from '@/types/gasto';

const TODAS_LAS_PERSONAS = 'todas-las-personas';
const TODAS_LAS_CATEGORIAS = 'todas-las-categorias';

type FiltrosGastosProps = {
  personas: Persona[];
  categorias: CategoriaGasto[];
  filtros: FiltrosGasto;
  onFiltrosChange: (filtros: FiltrosGasto) => void;
};

function aFechaISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function FiltrosGastos({ personas, categorias, filtros, onFiltrosChange }: FiltrosGastosProps) {
  const rango: DateRange | undefined = filtros.desde
    ? { from: new Date(filtros.desde), to: filtros.hasta ? new Date(filtros.hasta) : undefined }
    : undefined;

  function handleRangoChange(nuevoRango: DateRange | undefined) {
    onFiltrosChange({
      ...filtros,
      desde: nuevoRango?.from ? aFechaISO(nuevoRango.from) : null,
      hasta: nuevoRango?.to ? aFechaISO(nuevoRango.to) : null,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filtros.personaId ?? TODAS_LAS_PERSONAS}
        onValueChange={(value) =>
          onFiltrosChange({ ...filtros, personaId: value === TODAS_LAS_PERSONAS ? null : value })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Quién gastó" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS_LAS_PERSONAS}>Todas las personas</SelectItem>
          {personas.map((persona) => (
            <SelectItem key={persona.id} value={persona.id}>
              {persona.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filtros.categoriaId ?? TODAS_LAS_CATEGORIAS}
        onValueChange={(value) =>
          onFiltrosChange({ ...filtros, categoriaId: value === TODAS_LAS_CATEGORIAS ? null : value })
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS_LAS_CATEGORIAS}>Todas las categorías</SelectItem>
          {categorias.map((categoria) => (
            <SelectItem key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filtros.campoFecha}
        onValueChange={(value) => onFiltrosChange({ ...filtros, campoFecha: value as CampoFechaGasto })}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at">Fecha de creación</SelectItem>
          <SelectItem value="updated_at">Fecha de actualización</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-64 justify-start font-normal">
            <CalendarIcon className="mr-2 size-4" />
            {filtros.desde ? `${filtros.desde}${filtros.hasta ? ` – ${filtros.hasta}` : ''}` : 'Rango de fechas'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="range" selected={rango} onSelect={handleRangoChange} numberOfMonths={2} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/gastos/listado-gastos.tsx`**

Owns filter state, computes the filtered list via `filtrarGastos`, and renders the filter bar + record counter + table — the "barra de filtros arriba de la tabla, con contador a la derecha" pattern from `docs/DESIGN_SYSTEM.md` section 5.

```tsx
'use client';

import { useMemo, useState } from 'react';
import { FiltrosGastos } from '@/components/gastos/filtros-gastos';
import { TablaGastos } from '@/components/gastos/tabla-gastos';
import { filtrarGastos } from '@/lib/filtrarGastos';
import type { CategoriaGasto, FiltrosGasto, Gasto, Persona } from '@/types/gasto';

const FILTROS_INICIALES: FiltrosGasto = {
  personaId: null,
  categoriaId: null,
  campoFecha: 'created_at',
  desde: null,
  hasta: null,
};

type ListadoGastosProps = {
  gastos: Gasto[];
  personas: Persona[];
  categorias: CategoriaGasto[];
};

export function ListadoGastos({ gastos, personas, categorias }: ListadoGastosProps) {
  const [filtros, setFiltros] = useState<FiltrosGasto>(FILTROS_INICIALES);
  const gastosFiltrados = useMemo(() => filtrarGastos(gastos, filtros), [gastos, filtros]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FiltrosGastos personas={personas} categorias={categorias} filtros={filtros} onFiltrosChange={setFiltros} />
        <div className="ml-auto text-sm text-muted-foreground">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />
          {gastosFiltrados.length} {gastosFiltrados.length === 1 ? 'gasto' : 'gastos'}
        </div>
      </div>
      <TablaGastos gastos={gastosFiltrados} personas={personas} categorias={categorias} />
    </div>
  );
}
```

- [ ] **Step 5: Write `src/app/gastos/page.tsx`**

Uses the new page-header pattern from `docs/DESIGN_SYSTEM.md` section 4 (`text-2xl font-semibold tracking-tight` + subtitle) — this intentionally differs from `proveedores`/`productos`' current `text-4xl` no-subtitle header; those are not being retrofitted in this task (confirmed scope).

```tsx
import { Button } from '@/components/ui/button';
import { FormularioGasto } from '@/components/gastos/formulario-gasto';
import { ListadoGastos } from '@/components/gastos/listado-gastos';
import { gastosService } from '@/lib/services/gastosService';
import { personasService } from '@/lib/services/personasService';
import { categoriasGastoService } from '@/lib/services/categoriasGastoService';

export default async function GastosPage() {
  const [gastos, personas, categorias] = await Promise.all([
    gastosService.listar(),
    personasService.listar(),
    categoriasGastoService.listar(),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrá y controlá los gastos operativos del emprendimiento.
          </p>
        </div>
        <FormularioGasto personas={personas} categorias={categorias} trigger={<Button>Nuevo gasto</Button>} />
      </div>
      <ListadoGastos gastos={gastos} personas={personas} categorias={categorias} />
    </main>
  );
}
```

- [ ] **Step 6: Write `src/app/gastos/loading.tsx`**

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function GastosLoading() {
  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-9 w-full max-w-2xl" />
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Add the sidebar entry**

Modify `src/components/layout/app-sidebar.tsx` — add one import and one `NAV_ITEMS` entry, nothing else changes:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Truck, Wallet } from 'lucide-react';
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
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/gastos', label: 'Gastos', icon: Wallet },
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

- [ ] **Step 8: Commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add src/components/ui/data-table.tsx src/components/gastos/tabla-gastos.tsx src/components/gastos/filtros-gastos.tsx src/components/gastos/listado-gastos.tsx src/app/gastos/page.tsx src/app/gastos/loading.tsx src/components/layout/app-sidebar.tsx
git commit -m "feat: add gastos table, filters, page, and sidebar entry"
```

---

### Task 12: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run test
```

Expected: all tests pass, including every pre-existing test (30+ from before this feature) plus the new ones from Tasks 3, 4, 6, 7, 8.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`, and the route list includes `○ /gastos`.

- [ ] **Step 3: Run the linter**

```bash
npm run lint
```

Expected: no new errors introduced by this feature. (The pre-existing `use-mobile.ts` lint error is unrelated to this feature and out of scope here.)

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Open `/gastos` in a browser and confirm: the page loads with the two seeded personas and seven seeded categorías available in their selects; creating a gasto with no categoría succeeds; the persona and categoría badges render with distinct colors in both light and dark mode; editing a gasto updates its "Actualizado" column without changing "Creado"; deleting asks for confirmation; the persona/categoría/date-range filters narrow the table and the counter updates; the sidebar shows "Gastos" and highlights when active.

- [ ] **Step 5: Push the branch (do not open a PR yet — hand back to the user first)**

```bash
git push -u origin feature/listado-gastos
```
