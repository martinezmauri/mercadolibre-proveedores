# Listado de Productos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/productos` page (same pattern as `/proveedores`: table, row-click detail modal, skeleton, Acciones column) where each product belongs to exactly one proveedor and optionally one categoria, with fields for name, URL, image URL, and two prices (retail/wholesale).

**Architecture:** Mirrors the proveedores feature exactly — Server Components fetch data, Server Actions validate+delegate, a service module talks to Supabase, shadcn/ui components for everything. Unlike proveedores↔categorias (many-to-many via a join table), producto↔categoria is a direct many-to-one (`categoria_id` column), so `productosService` needs no RPC/transaction — single-row inserts/updates are atomic by nature. A small shared-code refactor extracts `ActionResult`/`toActionResult` (currently private to proveedores' actions file) into `src/lib/actionResult.ts` so productos can reuse it.

**Tech Stack:** Next.js App Router, Supabase (Postgres), shadcn/ui (`Select` — new addition — plus `Dialog`, `AlertDialog`, `Form`, `Badge`, `Button`, `Input`, all already installed), React Hook Form + Zod, TanStack Table via the existing `DataTable`.

## Global Constraints

- Producto fields: `proveedorId` (required, FK), `categoriaId` (optional, FK, single — not multiple like proveedor's categorias), `nombre` (required), `url` (required, http/https only — same XSS-safe validation as proveedor's url), `imagenUrl` (optional, http/https only when present), `precioMenor` (optional, ≥ 0), `precioMayor` (optional, ≥ 0).
- No RPC/transaction needed for producto writes — it's a single-row table with a direct FK, not a join table like proveedor_categorias.
- Reuse existing shared infrastructure: `createSupabaseServerClient`, `throwOnSupabaseError`, `createQueryMock` (test helper), `DataTable` (generic table with `onRowClick`), `Categoria`/`Proveedor` types from `src/types/proveedor.ts` (don't redefine them).
- No login/auth (same private-link model as the rest of the app). TypeScript strict, no `any`, no `@ts-ignore`. Only shadcn/ui components for interactive UI elements.
- Automated tests cover only `src/lib/services/*` (same scope as the rest of this project) — `productosService` gets full TDD coverage; UI is verified manually.
- Sidebar gets exactly one new item: "Productos" → `/productos`, using the same active-highlighting pattern as the existing two items.

---

### Task 1: Supabase schema for productos

**Files:**
- Create: `supabase/migrations/<timestamp>_productos_schema.sql` (saved copy of the applied SQL, same convention as prior migrations in this repo)

**Interfaces:**
- Produces: table `public.productos(id, proveedor_id, categoria_id, nombre, url, imagen_url, precio_menor, precio_mayor, created_at)` — consumed by Task 2's `productosService`.

- [ ] **Step 1: Apply the migration via the Supabase MCP tool**

Call `mcp__plugin_supabase_supabase__apply_migration` with `project_id: "vngsqjzlmqcpxlxtkbel"`, `name: "productos_schema"`, and this `query`:

```sql
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  nombre text not null,
  url text not null,
  imagen_url text,
  precio_menor numeric,
  precio_mayor numeric,
  created_at timestamptz not null default now()
);

alter table public.productos enable row level security;
```

No RLS policies are created — same intentional default-deny pattern as every other table in this project (only the server-side secret key, which bypasses RLS, ever touches these tables).

Expected: tool returns success.

- [ ] **Step 2: Verify the schema**

Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id: "vngsqjzlmqcpxlxtkbel"` and a query that confirms the table exists with the right columns/constraints (e.g. selecting from `information_schema.columns` for `table_name = 'productos'`, and checking `pg_constraint`/`pg_policies` for the two FKs and RLS state).

- [ ] **Step 3: Run the security advisor**

Call `mcp__plugin_supabase_supabase__get_advisors` with `project_id: "vngsqjzlmqcpxlxtkbel"`, `type: "security"`. Expected: only the now-4 expected INFO-level `rls_enabled_no_policy` findings (the 3 pre-existing ones plus this new `productos` table), no ERROR/WARN.

- [ ] **Step 4: Save the applied SQL into the repo and commit**

```bash
mkdir -p "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre\supabase\migrations"
```

Write the same SQL from Step 1 into `supabase/migrations/<timestamp>_productos_schema.sql` (generate `<timestamp>` via `date +%Y%m%d%H%M%S`), then:

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
git add supabase/migrations
git commit -m "feat(db): create productos schema"
```

---

### Task 2: Shared ActionResult refactor + producto types + productosService (TDD)

**Files:**
- Create: `src/lib/actionResult.ts` (replaces its current content)
- Create: `src/lib/handleActionResult.ts`
- Modify: `src/app/proveedores/actions.ts`
- Modify: `src/components/proveedores/formulario-proveedor.tsx` (one import line)
- Modify: `src/components/proveedores/boton-eliminar-proveedor.tsx` (one import line)
- Create: `src/types/producto.ts`
- Create: `src/lib/services/productosService.ts`
- Test: `src/lib/services/productosService.test.ts`

**Interfaces:**
- Produces: `ActionResult` type + `toActionResult(error: unknown): ActionResult` from `@/lib/actionResult` (no `sonner` import in this file — safe for both server and client code).
- Produces: `handleActionResult(result: ActionResult, successMessage: string): boolean` from `@/lib/handleActionResult` (client-only, imports `sonner`).
- Produces: `Producto`/`ProductoInput` types from `@/types/producto.ts` (imports `Categoria`/`Proveedor` from `@/types/proveedor.ts` — does not redefine them).
- Produces: `productosService.listar(): Promise<Producto[]>`, `.crear(input: ProductoInput): Promise<Producto>`, `.actualizar(id: string, input: ProductoInput): Promise<Producto>`, `.eliminar(id: string): Promise<void>` — consumed by Task 3's Server Actions.

- [ ] **Step 1: Split `ActionResult`/`toActionResult` out into a shared, server-safe module**

`src/lib/actionResult.ts` (replaces its current content, which currently imports `ActionResult` FROM `proveedores/actions.ts` — this step reverses that dependency direction):

```ts
import { z } from 'zod';

export type ActionResult = { success: true } | { success: false; error: string };

export function toActionResult(error: unknown): ActionResult {
  if (error instanceof z.ZodError) {
    return { success: false, error: error.issues[0]?.message ?? 'Datos inválidos' };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: 'Ocurrió un error inesperado' };
}
```

`src/lib/handleActionResult.ts` (new file — kept separate from `actionResult.ts` so that server action files never pull `sonner`, a client-side toast library, into their import graph):

```ts
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/actionResult';

export function handleActionResult(result: ActionResult, successMessage: string): boolean {
  if (!result.success) {
    toast.error(result.error);
    return false;
  }
  toast.success(successMessage);
  return true;
}
```

- [ ] **Step 2: Update `proveedores/actions.ts` to use the shared `toActionResult`**

Replace the full content of `src/app/proveedores/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { toActionResult, type ActionResult } from '@/lib/actionResult';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { proveedorSchema } from '@/lib/validation/proveedorSchema';

export async function crearProveedorAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = proveedorSchema.parse(input);
    await proveedoresService.crear(parsed);
    revalidatePath('/proveedores');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function actualizarProveedorAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = proveedorSchema.parse(input);
    await proveedoresService.actualizar(id, parsed);
    revalidatePath('/proveedores');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function eliminarProveedorAction(id: string): Promise<ActionResult> {
  try {
    await proveedoresService.eliminar(id);
    revalidatePath('/proveedores');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}
```

- [ ] **Step 3: Update the two components that import `handleActionResult`**

In `src/components/proveedores/formulario-proveedor.tsx` and `src/components/proveedores/boton-eliminar-proveedor.tsx`, change:

```ts
import { handleActionResult } from '@/lib/actionResult';
```

to:

```ts
import { handleActionResult } from '@/lib/handleActionResult';
```

Nothing else in either file changes.

- [ ] **Step 4: Producto types**

`src/types/producto.ts`:

```ts
export type Producto = {
  id: string;
  proveedorId: string;
  categoriaId: string | null;
  nombre: string;
  url: string;
  imagenUrl: string | null;
  precioMenor: number | null;
  precioMayor: number | null;
  createdAt: string;
};

export type ProductoInput = {
  proveedorId: string;
  categoriaId: string | null;
  nombre: string;
  url: string;
  imagenUrl: string | null;
  precioMenor: number | null;
  precioMayor: number | null;
};
```

- [ ] **Step 5: Write the failing tests for `productosService`**

`src/lib/services/productosService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productosService } from './productosService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

const mockedCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;

describe('productosService', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  describe('listar', () => {
    it('devuelve los productos mapeados desde snake_case', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({
          data: [
            {
              id: 'p1',
              proveedor_id: 'prov1',
              categoria_id: 'cat1',
              nombre: 'Termo 1L',
              url: 'https://ejemplo.com/termo',
              imagen_url: 'https://ejemplo.com/termo.jpg',
              precio_menor: 15000,
              precio_mayor: 12000,
              created_at: '2026-07-23T00:00:00.000Z',
            },
          ],
          error: null,
        })
      );
      mockedCreateClient.mockReturnValue({ from });

      const result = await productosService.listar();

      expect(from).toHaveBeenCalledWith('productos');
      expect(result).toEqual([
        {
          id: 'p1',
          proveedorId: 'prov1',
          categoriaId: 'cat1',
          nombre: 'Termo 1L',
          url: 'https://ejemplo.com/termo',
          imagenUrl: 'https://ejemplo.com/termo.jpg',
          precioMenor: 15000,
          precioMayor: 12000,
          createdAt: '2026-07-23T00:00:00.000Z',
        },
      ]);
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(productosService.listar()).rejects.toThrow('No se pudieron cargar los productos: timeout');
    });
  });

  describe('crear', () => {
    it('inserta el producto y devuelve el registro mapeado', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({
          data: {
            id: 'p1',
            proveedor_id: 'prov1',
            categoria_id: null,
            nombre: 'Termo 1L',
            url: 'https://ejemplo.com/termo',
            imagen_url: null,
            precio_menor: 15000,
            precio_mayor: null,
            created_at: '2026-07-23T00:00:00.000Z',
          },
          error: null,
        })
      );
      mockedCreateClient.mockReturnValue({ from });

      const result = await productosService.crear({
        proveedorId: 'prov1',
        categoriaId: null,
        nombre: 'Termo 1L',
        url: 'https://ejemplo.com/termo',
        imagenUrl: null,
        precioMenor: 15000,
        precioMayor: null,
      });

      expect(from).toHaveBeenCalledWith('productos');
      expect(result.id).toBe('p1');
      expect(result.proveedorId).toBe('prov1');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(
        productosService.crear({
          proveedorId: 'prov1',
          categoriaId: null,
          nombre: 'Termo 1L',
          url: 'https://ejemplo.com/termo',
          imagenUrl: null,
          precioMenor: null,
          precioMayor: null,
        })
      ).rejects.toThrow('No se pudo crear el producto: fk violation');
    });
  });

  describe('actualizar', () => {
    it('actualiza el producto y devuelve el registro mapeado', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({
          data: {
            id: 'p1',
            proveedor_id: 'prov1',
            categoria_id: 'cat1',
            nombre: 'Termo 1L (actualizado)',
            url: 'https://ejemplo.com/termo',
            imagen_url: null,
            precio_menor: 16000,
            precio_mayor: 13000,
            created_at: '2026-07-23T00:00:00.000Z',
          },
          error: null,
        })
      );
      mockedCreateClient.mockReturnValue({ from });

      const result = await productosService.actualizar('p1', {
        proveedorId: 'prov1',
        categoriaId: 'cat1',
        nombre: 'Termo 1L (actualizado)',
        url: 'https://ejemplo.com/termo',
        imagenUrl: null,
        precioMenor: 16000,
        precioMayor: 13000,
      });

      expect(result.nombre).toBe('Termo 1L (actualizado)');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'not found' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(
        productosService.actualizar('p1', {
          proveedorId: 'prov1',
          categoriaId: null,
          nombre: 'x',
          url: 'https://ejemplo.com',
          imagenUrl: null,
          precioMenor: null,
          precioMayor: null,
        })
      ).rejects.toThrow('No se pudo actualizar el producto: not found');
    });
  });

  describe('eliminar', () => {
    it('elimina el producto por id', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 1 }));
      mockedCreateClient.mockReturnValue({ from });

      await productosService.eliminar('p1');

      expect(from).toHaveBeenCalledWith('productos');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(productosService.eliminar('p1')).rejects.toThrow('No se pudo eliminar el producto: fk violation');
    });

    it('lanza un error legible si el producto ya no existe', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 0 }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(productosService.eliminar('p1')).rejects.toThrow(
        'El producto ya no existe (probablemente ya fue eliminado por otra persona).'
      );
    });
  });
});
```

- [ ] **Step 6: Run to confirm it fails**

```bash
npx vitest run src/lib/services/productosService.test.ts
```

Expected: FAIL — `Cannot find module './productosService'`.

- [ ] **Step 7: Implement `productosService`**

`src/lib/services/productosService.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { Producto, ProductoInput } from '@/types/producto';

type ProductoRow = {
  id: string;
  proveedor_id: string;
  categoria_id: string | null;
  nombre: string;
  url: string;
  imagen_url: string | null;
  precio_menor: number | null;
  precio_mayor: number | null;
  created_at: string;
};

const SELECT_COLUMNAS =
  'id, proveedor_id, categoria_id, nombre, url, imagen_url, precio_menor, precio_mayor, created_at';

function mapRow(row: ProductoRow): Producto {
  return {
    id: row.id,
    proveedorId: row.proveedor_id,
    categoriaId: row.categoria_id,
    nombre: row.nombre,
    url: row.url,
    imagenUrl: row.imagen_url,
    precioMenor: row.precio_menor,
    precioMayor: row.precio_mayor,
    createdAt: row.created_at,
  };
}

function toRow(input: ProductoInput) {
  return {
    proveedor_id: input.proveedorId,
    categoria_id: input.categoriaId,
    nombre: input.nombre,
    url: input.url,
    imagen_url: input.imagenUrl,
    precio_menor: input.precioMenor,
    precio_mayor: input.precioMayor,
  };
}

export const productosService = {
  async listar(): Promise<Producto[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_COLUMNAS)
      .order('created_at', { ascending: false });

    throwOnSupabaseError(error, 'No se pudieron cargar los productos');
    return (data as ProductoRow[]).map(mapRow);
  },

  async crear(input: ProductoInput): Promise<Producto> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('productos')
      .insert(toRow(input))
      .select(SELECT_COLUMNAS)
      .single();

    throwOnSupabaseError(error, 'No se pudo crear el producto');
    return mapRow(data as ProductoRow);
  },

  async actualizar(id: string, input: ProductoInput): Promise<Producto> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('productos')
      .update(toRow(input))
      .eq('id', id)
      .select(SELECT_COLUMNAS)
      .single();

    throwOnSupabaseError(error, 'No se pudo actualizar el producto');
    return mapRow(data as ProductoRow);
  },

  async eliminar(id: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error, count } = await supabase
      .from('productos')
      .delete({ count: 'exact' })
      .eq('id', id);

    throwOnSupabaseError(error, 'No se pudo eliminar el producto');
    if (count === 0) {
      throw new Error('El producto ya no existe (probablemente ya fue eliminado por otra persona).');
    }
  },
};
```

- [ ] **Step 8: Run to confirm it passes**

```bash
npx vitest run src/lib/services/productosService.test.ts
```

Expected: PASS (8 tests).

- [ ] **Step 9: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (existing 16 + new 8 = 24).

- [ ] **Step 10: Verify the refactor didn't break anything**

```bash
npm run build
npx tsc --noEmit
```

Expected: both clean/successful.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add productosService and share ActionResult across features"
```

---

### Task 3: Producto validation schema + Server Actions

**Files:**
- Create: `src/lib/validation/productoSchema.ts`
- Create: `src/app/productos/actions.ts`

**Interfaces:**
- Consumes: `productosService` from Task 2; `toActionResult`/`ActionResult` from `@/lib/actionResult`.
- Produces: `productoSchema: ZodSchema`, `ProductoFormValues` type, `crearProductoAction(input: unknown): Promise<ActionResult>`, `actualizarProductoAction(id: string, input: unknown): Promise<ActionResult>`, `eliminarProductoAction(id: string): Promise<ActionResult>` — consumed by Task 4's form and Task 5's table.

- [ ] **Step 1: Zod schema**

`src/lib/validation/productoSchema.ts`:

```ts
import { z } from 'zod';

export const productoSchema = z.object({
  proveedorId: z.string().min(1, 'Seleccioná un proveedor'),
  categoriaId: z.string().nullable(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  url: z.string().url({ protocol: /^https?$/, error: 'Ingresá una URL válida' }),
  imagenUrl: z.string().url({ protocol: /^https?$/, error: 'Ingresá una URL de imagen válida' }).nullable(),
  precioMenor: z.coerce.number().min(0, 'El precio no puede ser negativo').nullable(),
  precioMayor: z.coerce.number().min(0, 'El precio no puede ser negativo').nullable(),
});

export type ProductoFormValues = z.infer<typeof productoSchema>;
```

- [ ] **Step 2: Server Actions**

`src/app/productos/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { toActionResult, type ActionResult } from '@/lib/actionResult';
import { productosService } from '@/lib/services/productosService';
import { productoSchema } from '@/lib/validation/productoSchema';

export async function crearProductoAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = productoSchema.parse(input);
    await productosService.crear(parsed);
    revalidatePath('/productos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function actualizarProductoAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = productoSchema.parse(input);
    await productosService.actualizar(id, parsed);
    revalidatePath('/productos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function eliminarProductoAction(id: string): Promise<ActionResult> {
  try {
    await productosService.eliminar(id);
    revalidatePath('/productos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Zod validation and Server Actions for productos"
```

---

### Task 4: UI — provider/category selectors and the product form dialog

**Files:**
- Create: `src/components/ui/select.tsx` (shadcn, new)
- Create: `src/components/productos/formulario-producto.tsx`
- Create: `src/components/productos/boton-eliminar-producto.tsx`

**Interfaces:**
- Consumes: `Categoria`/`Proveedor` types from `@/types/proveedor.ts`, `Producto` from `@/types/producto.ts`, `productoSchema`/`ProductoFormValues` and the three producto Server Actions from Task 3, `handleActionResult` from `@/lib/handleActionResult`.
- Produces: `FormularioProducto({ proveedores, categorias, producto?, trigger?, open?, onOpenChange? })` and `BotonEliminarProducto({ productoId, productoNombre })` — consumed by Task 5.

- [ ] **Step 1: Install shadcn's Select component**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx shadcn@latest add select -y
```

If the installed CLI's current preset returns an empty/stub file (a prior task in this project hit this for other components), fetch it from the classic registry instead: `npx shadcn@latest add "https://ui.shadcn.com/r/styles/new-york-v4/select.json" -y`. Verify the resulting `src/components/ui/select.tsx` exports `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` with real content before proceeding.

- [ ] **Step 2: Product form dialog**

`src/components/productos/formulario-producto.tsx`:

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
import { productoSchema, type ProductoFormValues } from '@/lib/validation/productoSchema';
import { crearProductoAction, actualizarProductoAction } from '@/app/productos/actions';
import { handleActionResult } from '@/lib/handleActionResult';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

const SIN_CATEGORIA = 'sin-categoria';

type FormularioProductoProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
  producto?: Producto;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ProductoFormInput = z.input<typeof productoSchema>;

function buildDefaultValues(producto?: Producto): ProductoFormInput {
  return {
    proveedorId: producto?.proveedorId ?? '',
    categoriaId: producto?.categoriaId ?? null,
    nombre: producto?.nombre ?? '',
    url: producto?.url ?? '',
    imagenUrl: producto?.imagenUrl ?? null,
    precioMenor: producto?.precioMenor ?? null,
    precioMayor: producto?.precioMayor ?? null,
  };
}

export function FormularioProducto({
  proveedores,
  categorias,
  producto,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: FormularioProductoProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const form = useForm<ProductoFormInput, unknown, ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: buildDefaultValues(producto),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(producto));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: ProductoFormValues) {
    const result = producto
      ? await actualizarProductoAction(producto.id, values)
      : await crearProductoAction(values);

    if (!handleActionResult(result, producto ? 'Producto actualizado' : 'Producto creado')) {
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
          <DialogTitle>{producto ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="proveedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná un proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {proveedores.map((proveedor) => (
                        <SelectItem key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre}
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
                  <FormLabel>URL del producto</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imagenUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen (URL)</FormLabel>
                  <FormControl>
                    <Input
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
              name="precioMenor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio por menor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precioMayor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio por mayor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
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
            <DialogFooter>
              <Button type="submit">{producto ? 'Guardar cambios' : 'Crear producto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Delete confirmation button**

`src/components/productos/boton-eliminar-producto.tsx`:

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
import { eliminarProductoAction } from '@/app/productos/actions';
import { handleActionResult } from '@/lib/handleActionResult';

type BotonEliminarProductoProps = {
  productoId: string;
  productoNombre: string;
};

export function BotonEliminarProducto({ productoId, productoNombre }: BotonEliminarProductoProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await eliminarProductoAction(productoId);
      handleActionResult(result, 'Producto eliminado');
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
          <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará &quot;{productoNombre}&quot;. Esta acción no se puede deshacer.
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

- [ ] **Step 4: Verify**

```bash
npm run build
npx tsc --noEmit
```

Expected: both clean.

Grep for `any`/`@ts-ignore` in both new files — expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): add product form dialog and delete confirmation"
```

---

### Task 5: UI — products table, detail dialog, page, and sidebar entry

**Files:**
- Create: `src/components/productos/detalle-producto-dialog.tsx`
- Create: `src/components/productos/columnas-productos.tsx`
- Create: `src/components/productos/tabla-productos.tsx`
- Create: `src/app/productos/page.tsx`
- Create: `src/app/productos/loading.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

**Interfaces:**
- Consumes: `DataTable` (with `onRowClick`), `FormularioProducto`/`BotonEliminarProducto` (Task 4), `productosService`/`proveedoresService`/`categoriasService`.
- Produces: the `/productos` route, fully wired, and its sidebar entry.

- [ ] **Step 1: Read-only detail dialog**

`src/components/productos/detalle-producto-dialog.tsx`:

```tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

type DetalleProductoDialogProps = {
  producto: Producto | null;
  proveedores: Proveedor[];
  categorias: Categoria[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditar: (producto: Producto) => void;
};

export function DetalleProductoDialog({
  producto,
  proveedores,
  categorias,
  open,
  onOpenChange,
  onEditar,
}: DetalleProductoDialogProps) {
  if (!producto) return null;

  const proveedor = proveedores.find((p) => p.id === producto.proveedorId);
  const categoria = categorias.find((c) => c.id === producto.categoriaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{producto.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Proveedor: </span>
            {proveedor?.nombre ?? '—'}
          </div>
          <div>
            <span className="font-medium">URL: </span>
            <a href={producto.url} target="_blank" rel="noreferrer" className="underline">
              {producto.url}
            </a>
          </div>
          {producto.imagenUrl ? (
            <div>
              <span className="font-medium">Imagen: </span>
              <a href={producto.imagenUrl} target="_blank" rel="noreferrer" className="underline">
                {producto.imagenUrl}
              </a>
            </div>
          ) : null}
          <div>
            <span className="font-medium">Precio por menor: </span>
            {producto.precioMenor ?? '—'}
          </div>
          <div>
            <span className="font-medium">Precio por mayor: </span>
            {producto.precioMayor ?? '—'}
          </div>
          <div>
            <span className="font-medium">Categoría: </span>
            {categoria ? <Badge variant="secondary">{categoria.nombre}</Badge> : '—'}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={() => onEditar(producto)}>Editar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Column definitions**

`src/components/productos/columnas-productos.tsx`:

```tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import { BotonEliminarProducto } from '@/components/productos/boton-eliminar-producto';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

type CrearColumnasParams = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function crearColumnas({ proveedores, categorias }: CrearColumnasParams): ColumnDef<Producto>[] {
  const proveedorPorId = new Map(proveedores.map((p) => [p.id, p.nombre]));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c.nombre]));

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
        const nombre = row.original.categoriaId ? categoriaPorId.get(row.original.categoriaId) : undefined;
        return nombre ? <Badge variant="secondary">{nombre}</Badge> : null;
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

- [ ] **Step 3: Table component**

`src/components/productos/tabla-productos.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { crearColumnas } from '@/components/productos/columnas-productos';
import { DetalleProductoDialog } from '@/components/productos/detalle-producto-dialog';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

type TablaProductosProps = {
  productos: Producto[];
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function TablaProductos({ productos, proveedores, categorias }: TablaProductosProps) {
  const columns = useMemo(() => crearColumnas({ proveedores, categorias }), [proveedores, categorias]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productoAEditar, setProductoAEditar] = useState<Producto | null>(null);

  return (
    <>
      <DataTable
        columns={columns}
        data={productos}
        emptyMessage="No hay productos cargados"
        onRowClick={setProductoSeleccionado}
      />
      <DetalleProductoDialog
        producto={productoSeleccionado}
        proveedores={proveedores}
        categorias={categorias}
        open={productoSeleccionado !== null}
        onOpenChange={(open) => {
          if (!open) setProductoSeleccionado(null);
        }}
        onEditar={(producto) => {
          setProductoSeleccionado(null);
          setProductoAEditar(producto);
        }}
      />
      <FormularioProducto
        proveedores={proveedores}
        categorias={categorias}
        producto={productoAEditar ?? undefined}
        open={productoAEditar !== null}
        onOpenChange={(open) => {
          if (!open) setProductoAEditar(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: Page and loading skeleton**

`src/app/productos/page.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { FormularioProducto } from '@/components/productos/formulario-producto';
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
        <h1 className="text-4xl font-semibold">Productos</h1>
        <FormularioProducto
          proveedores={proveedores}
          categorias={categorias}
          trigger={<Button>Nuevo producto</Button>}
        />
      </div>
      <TablaProductos productos={productos} proveedores={proveedores} categorias={categorias} />
    </main>
  );
}
```

`src/app/productos/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductosLoading() {
  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-2 rounded-md border p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Add the sidebar entry**

In `src/components/layout/app-sidebar.tsx`, add the `Package` icon import and a new nav entry. Change:

```tsx
import { Home, Truck } from 'lucide-react';
```

to:

```tsx
import { Home, Package, Truck } from 'lucide-react';
```

and change:

```tsx
const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
];
```

to:

```tsx
const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/productos', label: 'Productos', icon: Package },
];
```

Nothing else in the file changes.

- [ ] **Step 6: Verify**

```bash
npm run build
```

Expected: `Compiled successfully`, route list includes `/productos`.

```bash
npx tsc --noEmit
```

Expected: clean.

Grep for `any`/`@ts-ignore` in all new/modified files under `src/components/productos/` and `src/app/productos/` — expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): wire up the productos table, page, and sidebar entry"
```

---

### Task 6: Manual verification and push

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server (if not already running)**

```bash
npm run dev
```

- [ ] **Step 2: Manual test pass on `http://localhost:3000/productos`**

- Sidebar shows "Productos" between "Proveedores" and nothing else; clicking it navigates to `/productos` and highlights correctly.
- Page loads with an empty table and a "Nuevo producto" button on the right, title "Productos" large and left-aligned.
- Create a product: pick a proveedor from the dropdown, fill nombre/url/imagen/precios, pick a categoría (or leave "Sin categoría") → row appears showing the proveedor's name, category badge (if set), and both prices.
- Click the new row (not Editar/Eliminar) → detail dialog opens with proveedor name, URL, image link (if set), both prices, category.
- Click "Editar" inside the detail dialog → detail closes, edit form opens pre-filled correctly (including the right proveedor/categoria pre-selected).
- Edit and save → row updates.
- Delete via the Acciones column → confirmation dialog appears, confirms, row disappears.
- Submitting with no proveedor selected, or an invalid URL, shows inline validation errors.
- Throttle the network and reload `/productos` → skeleton appears before the real table.
- Revisit `/proveedores` — confirm nothing there regressed (the `ActionResult`/`handleActionResult` refactor from Task 2 touched shared code).

- [ ] **Step 3: Run the full test suite and build one more time**

```bash
npm test
npm run build
```

Expected: all tests pass (proveedores + productos), build succeeds.

- [ ] **Step 4: Push**

```bash
git push origin feature/listado-proveedores
```

Expected: branch updated on `https://github.com/martinezmauri/mercadolibre-proveedores`.
