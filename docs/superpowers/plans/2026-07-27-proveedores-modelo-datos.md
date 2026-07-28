# Modelo de Datos Flexible para Proveedores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modelo rígido actual de `proveedores` (una sola `url` obligatoria, un solo `whatsapp`) por un modelo flexible que soporte cantidad variable de contactos (teléfonos, whatsapp, email, redes sociales, direcciones) y notas libres, reutilizando la tabla `categorias` existente para el rubro comercial, y agregando paginación/búsqueda server-side al listado de `/proveedores` dado que va a pasar de unas pocas decenas de filas a +1000.

**Architecture:** Una tabla nueva `proveedor_contactos` (proveedor_id, tipo, valor) reemplaza la columna `whatsapp` y absorbe teléfonos/email/redes/direcciones. `proveedores.url` pasa a nullable y gana `notas text`. El rubro sigue viviendo en la tabla `categorias` compartida (sin cambios de esquema ahí). El listado de `/proveedores` pasa de "traer todo y renderizar" a paginación/búsqueda server-side controlada por query params en la URL.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estricto, Supabase/Postgres, Zod, react-hook-form, Tailwind v4, shadcn/ui, Vitest.

## Global Constraints

- Los tipos de contacto válidos son exactamente estos 7: `telefono`, `whatsapp`, `email`, `instagram`, `facebook`, `tiktok`, `direccion`. Se validan en la capa de aplicación (Zod), no como constraint de Postgres.
- `proveedores.url` pasa de `NOT NULL` a nullable. `proveedores.whatsapp` se elimina (sus valores existentes se migran a `proveedor_contactos` antes de borrar la columna, para no perder datos de proveedores ya cargados a mano).
- `proveedores.notas` es un campo de texto libre nullable nuevo.
- El `listar()` existente de `proveedoresService` (sin filtros, trae todo) se mantiene intacto — lo siguen usando el selector de proveedor en `/productos` y el conteo de Inicio. La paginación/búsqueda vive en un método nuevo `buscar(...)`, exclusivo de `/proveedores`.
- Tamaño de página fijo: 50 proveedores por página.
- No hay tests de componentes React en este proyecto (`vitest.config.ts` usa `environment: 'node'`). Solo se testea lógica pura (servicios, validación). Los componentes de UI de este plan (formulario, detalle, filtros, paginador) no llevan test automatizado — se verifican manualmente en navegador.
- Comillas simples, `;` al final de statements, imports nombrados desde `'react'`, consistente con el resto de `src/components/proveedores/`.
- Esta versión de Next.js tiene cambios respecto a lo que ya conocés (ver `AGENTS.md` del proyecto) — antes de escribir código que use `searchParams` en un Server Component o los hooks de `next/navigation`, revisá `node_modules/next/dist/docs/` para confirmar la API exacta en esta versión.

---

### Task 1: Migración de esquema — contactos flexibles

**Files:**
- Create: `supabase/migrations/20260727130000_proveedor_contactos.sql`

**Interfaces:**
- Produces: tabla `public.proveedor_contactos(id uuid, proveedor_id uuid, tipo text, valor text)`; `public.proveedores` gana `notas text` y pierde `whatsapp`; `url` pasa a nullable. RPCs `crear_proveedor`/`actualizar_proveedor` con nueva firma `(p_nombre, p_url, p_compra_minima, p_notas, p_categoria_ids, p_contactos jsonb)`. Task 2 consume exactamente esta firma desde `proveedoresService.ts`.

- [ ] **Step 1: Escribir la migración completa**

Crear `supabase/migrations/20260727130000_proveedor_contactos.sql`:

```sql
create table public.proveedor_contactos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  tipo text not null,
  valor text not null
);

alter table public.proveedor_contactos enable row level security;

alter table public.proveedores alter column url drop not null;
alter table public.proveedores add column notas text;

insert into public.proveedor_contactos (proveedor_id, tipo, valor)
select id, 'whatsapp', whatsapp
from public.proveedores
where whatsapp is not null;

alter table public.proveedores drop column whatsapp;

drop function if exists public.crear_proveedor(text, text, numeric, text, uuid[]);
drop function if exists public.actualizar_proveedor(uuid, text, text, numeric, text, uuid[]);

create or replace function public.crear_proveedor(
  p_nombre text,
  p_url text,
  p_compra_minima numeric,
  p_notas text,
  p_categoria_ids uuid[],
  p_contactos jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.proveedores (nombre, url, compra_minima, notas)
  values (p_nombre, p_url, p_compra_minima, p_notas)
  returning id into v_id;

  if p_categoria_ids is not null and array_length(p_categoria_ids, 1) is not null then
    insert into public.proveedor_categorias (proveedor_id, categoria_id)
    select v_id, unnest(p_categoria_ids);
  end if;

  if p_contactos is not null and jsonb_array_length(p_contactos) > 0 then
    insert into public.proveedor_contactos (proveedor_id, tipo, valor)
    select v_id, contacto.tipo, contacto.valor
    from jsonb_to_recordset(p_contactos) as contacto(tipo text, valor text);
  end if;

  return v_id;
end;
$$;

create or replace function public.actualizar_proveedor(
  p_id uuid,
  p_nombre text,
  p_url text,
  p_compra_minima numeric,
  p_notas text,
  p_categoria_ids uuid[],
  p_contactos jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.proveedores
  set nombre = p_nombre, url = p_url, compra_minima = p_compra_minima, notas = p_notas
  where id = p_id;

  delete from public.proveedor_categorias where proveedor_id = p_id;

  if p_categoria_ids is not null and array_length(p_categoria_ids, 1) is not null then
    insert into public.proveedor_categorias (proveedor_id, categoria_id)
    select p_id, unnest(p_categoria_ids);
  end if;

  delete from public.proveedor_contactos where proveedor_id = p_id;

  if p_contactos is not null and jsonb_array_length(p_contactos) > 0 then
    insert into public.proveedor_contactos (proveedor_id, tipo, valor)
    select p_id, contacto.tipo, contacto.valor
    from jsonb_to_recordset(p_contactos) as contacto(tipo text, valor text);
  end if;
end;
$$;
```

Nota: los `drop function if exists` son necesarios porque `create or replace function` no permite cambiar la lista de parámetros (se quita `p_whatsapp`, se agregan `p_notas`/`p_contactos`) — sin el drop previo, Postgres crearía una función sobrecargada nueva en vez de reemplazar la vieja, dejando ambas firmas activas. El `set search_path = public` replica el hardening ya aplicado en `20260723030900_pin_proveedor_rpc_search_path.sql`, que se pierde al recrear las funciones desde cero.

- [ ] **Step 2: Aplicar la migración**

Aplicar la migración contra el proyecto de Supabase (vía MCP de Supabase disponible en esta sesión, o `supabase db push` si corresponde al flujo del proyecto) y confirmar que corre sin errores.

- [ ] **Step 3: Verificar manualmente**

Consultar la base para confirmar: la tabla `proveedor_contactos` existe y tiene RLS habilitado; `proveedores.url` acepta `null`; `proveedores.notas` existe; `proveedores.whatsapp` ya no existe; los proveedores que antes tenían `whatsapp is not null` ahora tienen una fila correspondiente en `proveedor_contactos` con `tipo = 'whatsapp'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260727130000_proveedor_contactos.sql
git commit -m "feat: agregar tabla proveedor_contactos y migrar whatsapp existente"
```

---

### Task 2: Tipos, validación y servicio — contactos y notas

**Files:**
- Modify: `src/types/proveedor.ts`
- Modify: `src/lib/validation/proveedorSchema.ts`
- Modify: `src/lib/validation/proveedorSchema.test.ts`
- Modify: `src/lib/services/proveedoresService.ts`
- Modify: `src/lib/services/proveedoresService.test.ts`
- Modify: `src/app/proveedores/actions.test.ts`

**Interfaces:**
- Consumes: RPCs `crear_proveedor`/`actualizar_proveedor` de Task 1 con la firma `(p_nombre, p_url, p_compra_minima, p_notas, p_categoria_ids, p_contactos)`.
- Produces: `Proveedor`/`ProveedorInput`/`Contacto`/`TipoContacto` en `src/types/proveedor.ts`, y `proveedorSchema`/`ProveedorFormValues` en `src/lib/validation/proveedorSchema.ts`. Task 4 (formulario) y Task 5 (detalle) consumen estos tipos directamente.

- [ ] **Step 1: Actualizar los tipos**

Reemplazar el contenido de `src/types/proveedor.ts`:

```ts
import type { ColorToken } from '@/lib/badgeColors';

export type Categoria = {
  id: string;
  nombre: string;
  color: ColorToken;
};

export type TipoContacto = 'telefono' | 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'tiktok' | 'direccion';

export type Contacto = {
  id: string;
  tipo: TipoContacto;
  valor: string;
};

export type Proveedor = {
  id: string;
  nombre: string;
  url: string | null;
  compraMinima: number | null;
  notas: string | null;
  createdAt: string;
  categorias: Categoria[];
  contactos: Contacto[];
};

export type ProveedorInput = {
  nombre: string;
  url: string | null;
  compraMinima: number | null;
  notas: string | null;
  categoriaIds: string[];
  contactos: { tipo: TipoContacto; valor: string }[];
};
```

- [ ] **Step 2: Actualizar el schema de validación**

Reemplazar el contenido de `src/lib/validation/proveedorSchema.ts`:

```ts
import { z } from 'zod';

const urlHttpSchema = z.string().url({ protocol: /^https?$/, error: 'Ingresá una URL válida' });

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  url: z
    .string()
    .nullable()
    .transform((valor) => (valor && valor.trim() !== '' ? valor.trim() : null))
    .refine((valor) => valor === null || urlHttpSchema.safeParse(valor).success, {
      message: 'Ingresá una URL válida',
    }),
  compraMinima: z.coerce.number().min(0, 'La compra mínima no puede ser negativa').nullable(),
  notas: z
    .string()
    .nullable()
    .transform((valor) => (valor && valor.trim() !== '' ? valor.trim() : null)),
  categoriaIds: z.array(z.string()).default([]),
  contactos: z
    .array(
      z.object({
        tipo: z.enum(['telefono', 'whatsapp', 'email', 'instagram', 'facebook', 'tiktok', 'direccion']),
        valor: z.string().min(1, 'El valor no puede estar vacío'),
      })
    )
    .default([]),
});

export type ProveedorFormValues = z.infer<typeof proveedorSchema>;
```

- [ ] **Step 3: Actualizar el test del schema (RED esperado antes del Step 2, ya en GREEN después)**

Reemplazar el contenido de `src/lib/validation/proveedorSchema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { proveedorSchema } from './proveedorSchema';

const baseInput = {
  nombre: 'Proveedor Test',
  compraMinima: null,
  notas: null,
  categoriaIds: [],
  contactos: [],
};

describe('proveedorSchema url', () => {
  it('acepta URLs http/https válidas', () => {
    const result = proveedorSchema.safeParse({ ...baseInput, url: 'https://example.com' });

    expect(result.success).toBe(true);
  });

  it('acepta que la URL sea null (proveedor sin sitio web)', () => {
    const result = proveedorSchema.safeParse({ ...baseInput, url: null });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBeNull();
    }
  });

  it('acepta string vacío y lo normaliza a null', () => {
    const result = proveedorSchema.safeParse({ ...baseInput, url: '' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBeNull();
    }
  });

  it('rechaza URLs con esquema javascript: (XSS almacenado)', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: 'javascript:alert(document.cookie)',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Ingresá una URL válida');
    }
  });

  it('rechaza URLs con esquema data:', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: 'data:text/html,<script>alert(1)</script>',
    });

    expect(result.success).toBe(false);
  });
});

describe('proveedorSchema contactos', () => {
  it('acepta una lista de contactos con tipos válidos', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: null,
      contactos: [
        { tipo: 'telefono', valor: '11 4444-5555' },
        { tipo: 'instagram', valor: '@mayorista' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rechaza un tipo de contacto que no está en la lista permitida', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: null,
      contactos: [{ tipo: 'fax', valor: '123' }],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza un contacto con valor vacío', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: null,
      contactos: [{ tipo: 'telefono', valor: '' }],
    });

    expect(result.success).toBe(false);
  });
});
```

Run: `npm run test -- proveedorSchema`
Expected antes del Step 2: FAIL (el schema viejo todavía exige `whatsapp`, no tiene `contactos`, y `url` sigue siendo obligatoria). Expected después del Step 2: PASS.

- [ ] **Step 4: Actualizar el servicio**

Reemplazar el contenido de `src/lib/services/proveedoresService.ts`:

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { Categoria, Contacto, Proveedor, ProveedorInput } from '@/types/proveedor';

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

type ProveedorRow = {
  id: string;
  nombre: string;
  url: string | null;
  compra_minima: number | null;
  notas: string | null;
  created_at: string;
  proveedor_categorias: { categorias: Categoria }[];
  proveedor_contactos: Contacto[];
};

const SELECT_CON_CATEGORIAS = `
  id, nombre, url, compra_minima, notas, created_at,
  proveedor_categorias ( categorias ( id, nombre, color ) ),
  proveedor_contactos ( id, tipo, valor )
`;

function mapRow(row: ProveedorRow): Proveedor {
  return {
    id: row.id,
    nombre: row.nombre,
    url: row.url,
    compraMinima: row.compra_minima,
    notas: row.notas,
    createdAt: row.created_at,
    categorias: row.proveedor_categorias.map((pc) => pc.categorias),
    contactos: row.proveedor_contactos,
  };
}

async function obtenerPorId(supabase: SupabaseServerClient, id: string): Promise<Proveedor> {
  const { data, error } = await supabase
    .from('proveedores')
    .select(SELECT_CON_CATEGORIAS)
    .eq('id', id)
    .single();

  throwOnSupabaseError(error, 'No se pudo leer el proveedor');
  return mapRow(data as unknown as ProveedorRow);
}

export const proveedoresService = {
  async listar(): Promise<Proveedor[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('proveedores')
      .select(SELECT_CON_CATEGORIAS)
      .order('created_at', { ascending: false });

    throwOnSupabaseError(error, 'No se pudieron cargar los proveedores');
    return (data as unknown as ProveedorRow[]).map(mapRow);
  },

  async crear(input: ProveedorInput): Promise<Proveedor> {
    const supabase = createSupabaseServerClient();
    const { data: id, error } = await supabase.rpc('crear_proveedor', {
      p_nombre: input.nombre,
      p_url: input.url,
      p_compra_minima: input.compraMinima,
      p_notas: input.notas,
      p_categoria_ids: input.categoriaIds,
      p_contactos: input.contactos,
    });

    throwOnSupabaseError(error, 'No se pudo crear el proveedor');
    return obtenerPorId(supabase, id as string);
  },

  async actualizar(id: string, input: ProveedorInput): Promise<Proveedor> {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc('actualizar_proveedor', {
      p_id: id,
      p_nombre: input.nombre,
      p_url: input.url,
      p_compra_minima: input.compraMinima,
      p_notas: input.notas,
      p_categoria_ids: input.categoriaIds,
      p_contactos: input.contactos,
    });

    throwOnSupabaseError(error, 'No se pudo actualizar el proveedor');
    return obtenerPorId(supabase, id);
  },

  async eliminar(id: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error, count } = await supabase
      .from('proveedores')
      .delete({ count: 'exact' })
      .eq('id', id);

    throwOnSupabaseError(error, 'No se pudo eliminar el proveedor');
    if (count === 0) throw new Error('El proveedor ya no existe (probablemente ya fue eliminado por otra persona).');
  },
};
```

- [ ] **Step 5: Actualizar los tests del servicio**

En `src/lib/services/proveedoresService.test.ts`, reemplazar cada mock de fila que use `whatsapp`/`compra_minima` sin `notas`/`proveedor_contactos` por el nuevo shape. Por ejemplo, el primer caso de `listar`:

```ts
describe('listar', () => {
  it('devuelve los proveedores con sus categorías y contactos aplanados', async () => {
    const queryMock = createQueryMock({
      data: [
        {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compra_minima: 100,
          notas: 'Cierra a las 17hs',
          created_at: '2026-07-22T00:00:00.000Z',
          proveedor_categorias: [
            { categorias: { id: 'c1', nombre: 'hogar', color: 'amber' } },
            { categorias: { id: 'c2', nombre: 'cocina', color: 'orange' } },
          ],
          proveedor_contactos: [{ id: 'ct1', tipo: 'whatsapp', valor: '5491122334455' }],
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
        notas: 'Cierra a las 17hs',
        createdAt: '2026-07-22T00:00:00.000Z',
        categorias: [
          { id: 'c1', nombre: 'hogar', color: 'amber' },
          { id: 'c2', nombre: 'cocina', color: 'orange' },
        ],
        contactos: [{ id: 'ct1', tipo: 'whatsapp', valor: '5491122334455' }],
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
```

Aplicar el mismo criterio (agregar `notas`/`proveedor_contactos` a los mocks de fila, quitar `whatsapp`) en `crear` y `actualizar`, y actualizar las aserciones de `rpc).toHaveBeenCalledWith(...)` para usar `p_notas`/`p_contactos` en vez de `p_whatsapp`. Por ejemplo, para `crear`:

```ts
describe('crear', () => {
  it('llama a la RPC crear_proveedor con los parámetros correctos y devuelve el registro completo', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'p1', error: null });
    const finalRead = createQueryMock({
      data: {
        id: 'p1',
        nombre: 'Mayorista Uno',
        url: 'https://mayorista-uno.com',
        compra_minima: 100,
        notas: null,
        created_at: '2026-07-22T00:00:00.000Z',
        proveedor_categorias: [{ categorias: { id: 'c1', nombre: 'hogar', color: 'amber' } }],
        proveedor_contactos: [],
      },
      error: null,
    });
    const from = vi.fn().mockReturnValue(finalRead);

    mockedCreateClient.mockReturnValue({ rpc, from });

    const result = await proveedoresService.crear({
      nombre: 'Mayorista Uno',
      url: 'https://mayorista-uno.com',
      compraMinima: 100,
      notas: null,
      categoriaIds: ['c1'],
      contactos: [],
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('crear_proveedor', {
      p_nombre: 'Mayorista Uno',
      p_url: 'https://mayorista-uno.com',
      p_compra_minima: 100,
      p_notas: null,
      p_categoria_ids: ['c1'],
      p_contactos: [],
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
        notas: null,
        categoriaIds: ['c1'],
        contactos: [],
      })
    ).rejects.toThrow('No se pudo crear el proveedor: fk violation');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  });
});
```

Aplicar el mismo ajuste de forma análoga al bloque `describe('actualizar', ...)` (mismo cambio de `p_whatsapp` → `p_notas`/`p_contactos`, agregar `notas`/`contactos` al input y al mock de fila). El bloque `describe('eliminar', ...)` no cambia.

Run: `npm run test -- proveedoresService`
Expected: FAIL antes del Step 4 (el servicio viejo no manda `p_notas`/`p_contactos`), PASS después.

- [ ] **Step 6: Actualizar el fixture de `actions.test.ts`**

En `src/app/proveedores/actions.test.ts`, reemplazar `proveedorValido`:

```ts
const proveedorValido = {
  nombre: 'Mayorista Uno',
  url: 'https://mayorista-uno.com',
  compraMinima: 100,
  notas: null,
  categoriaIds: ['c1'],
  contactos: [{ tipo: 'whatsapp', valor: '5491122334455' }],
};
```

El resto del archivo no cambia.

Run: `npm run test -- actions.test`
Expected: PASS.

- [ ] **Step 7: Correr la suite completa y verificar tipos**

Run: `npm run test`
Expected: todos los tests en verde.

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/types/proveedor.ts src/lib/validation/proveedorSchema.ts src/lib/validation/proveedorSchema.test.ts src/lib/services/proveedoresService.ts src/lib/services/proveedoresService.test.ts src/app/proveedores/actions.test.ts
git commit -m "feat: modelar contactos y notas de proveedor en tipos, validación y servicio"
```

---

### Task 3: `proveedoresService.buscar()` — paginación y búsqueda

**Files:**
- Modify: `src/lib/services/testUtils/supabaseQueryMock.ts`
- Modify: `src/lib/services/proveedoresService.ts`
- Modify: `src/lib/services/proveedoresService.test.ts`

**Interfaces:**
- Produces: `proveedoresService.buscar({ pagina, tamañoPagina, busqueda, categoriaId }): Promise<{ proveedores: Proveedor[]; total: number }>`. Task 6 (página `/proveedores`) llama a este método con estos nombres de parámetros exactos.

- [ ] **Step 1: Extender el mock de Supabase para soportar `ilike`/`range`/`in`**

En `src/lib/services/testUtils/supabaseQueryMock.ts`, agregar los métodos nuevos a `chainMethods`:

```ts
const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order', 'ilike', 'range', 'in'];
```

- [ ] **Step 2: Escribir los tests que fallan**

Agregar a `src/lib/services/proveedoresService.test.ts`:

```ts
describe('buscar', () => {
  it('busca por nombre con paginación', async () => {
    const queryMock = createQueryMock({
      data: [
        {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: null,
          compra_minima: null,
          notas: null,
          created_at: '2026-07-27T00:00:00.000Z',
          proveedor_categorias: [],
          proveedor_contactos: [],
        },
      ],
      error: null,
      count: 1,
    });
    const from = vi.fn().mockReturnValue(queryMock);
    mockedCreateClient.mockReturnValue({ from });

    const result = await proveedoresService.buscar({
      pagina: 1,
      tamañoPagina: 50,
      busqueda: 'Mayorista',
      categoriaId: null,
    });

    expect(from).toHaveBeenCalledWith('proveedores');
    expect(queryMock.ilike).toHaveBeenCalledWith('nombre', '%Mayorista%');
    expect(queryMock.range).toHaveBeenCalledWith(0, 49);
    expect(result.total).toBe(1);
    expect(result.proveedores).toHaveLength(1);
    expect(result.proveedores[0].nombre).toBe('Mayorista Uno');
  });

  it('calcula el rango correcto para páginas mayores a 1', async () => {
    const queryMock = createQueryMock({ data: [], error: null, count: 0 });
    const from = vi.fn().mockReturnValue(queryMock);
    mockedCreateClient.mockReturnValue({ from });

    await proveedoresService.buscar({ pagina: 3, tamañoPagina: 50, busqueda: null, categoriaId: null });

    expect(queryMock.range).toHaveBeenCalledWith(100, 149);
    expect(queryMock.ilike).not.toHaveBeenCalled();
  });

  it('filtra por categoría resolviendo los proveedor_id primero', async () => {
    const categoriaQuery = createQueryMock({ data: [{ proveedor_id: 'p1' }], error: null });
    const proveedoresQuery = createQueryMock({
      data: [
        {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: null,
          compra_minima: null,
          notas: null,
          created_at: '2026-07-27T00:00:00.000Z',
          proveedor_categorias: [],
          proveedor_contactos: [],
        },
      ],
      error: null,
      count: 1,
    });
    const from = vi.fn().mockReturnValueOnce(categoriaQuery).mockReturnValueOnce(proveedoresQuery);
    mockedCreateClient.mockReturnValue({ from });

    const result = await proveedoresService.buscar({
      pagina: 1,
      tamañoPagina: 50,
      busqueda: null,
      categoriaId: 'c1',
    });

    expect(from).toHaveBeenNthCalledWith(1, 'proveedor_categorias');
    expect(categoriaQuery.eq).toHaveBeenCalledWith('categoria_id', 'c1');
    expect(from).toHaveBeenNthCalledWith(2, 'proveedores');
    expect(proveedoresQuery.in).toHaveBeenCalledWith('id', ['p1']);
    expect(result.total).toBe(1);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' }, count: null }));
    mockedCreateClient.mockReturnValue({ from });

    await expect(
      proveedoresService.buscar({ pagina: 1, tamañoPagina: 50, busqueda: null, categoriaId: null })
    ).rejects.toThrow('No se pudieron buscar los proveedores: timeout');
  });
});
```

Run: `npm run test -- proveedoresService`
Expected: FAIL — `proveedoresService.buscar` no existe todavía.

- [ ] **Step 3: Implementar `buscar()`**

Agregar a `src/lib/services/proveedoresService.ts`, dentro del objeto `proveedoresService` (después de `listar`):

```ts
  async buscar({
    pagina,
    tamañoPagina,
    busqueda,
    categoriaId,
  }: {
    pagina: number;
    tamañoPagina: number;
    busqueda: string | null;
    categoriaId: string | null;
  }): Promise<{ proveedores: Proveedor[]; total: number }> {
    const supabase = createSupabaseServerClient();
    const desde = (pagina - 1) * tamañoPagina;
    const hasta = desde + tamañoPagina - 1;

    let idsPorCategoria: string[] | null = null;
    if (categoriaId) {
      const { data, error } = await supabase
        .from('proveedor_categorias')
        .select('proveedor_id')
        .eq('categoria_id', categoriaId);

      throwOnSupabaseError(error, 'No se pudieron buscar los proveedores');
      idsPorCategoria = (data ?? []).map((fila: { proveedor_id: string }) => fila.proveedor_id);
    }

    let query = supabase
      .from('proveedores')
      .select(SELECT_CON_CATEGORIAS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(desde, hasta);

    if (busqueda) {
      query = query.ilike('nombre', `%${busqueda}%`);
    }

    if (idsPorCategoria !== null) {
      query = query.in('id', idsPorCategoria);
    }

    const { data, error, count } = await query;

    throwOnSupabaseError(error, 'No se pudieron buscar los proveedores');
    return {
      proveedores: (data as unknown as ProveedorRow[]).map(mapRow),
      total: count ?? 0,
    };
  },
```

- [ ] **Step 4: Correr los tests**

Run: `npm run test -- proveedoresService`
Expected: PASS (todos los casos de `buscar`, y los de `listar`/`crear`/`actualizar`/`eliminar` siguen en verde).

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/testUtils/supabaseQueryMock.ts src/lib/services/proveedoresService.ts src/lib/services/proveedoresService.test.ts
git commit -m "feat: agregar proveedoresService.buscar con paginación y búsqueda"
```

---

### Task 4: Componente Textarea y formulario de proveedor

**Files:**
- Create: `src/components/ui/textarea.tsx`
- Modify: `src/components/proveedores/formulario-proveedor.tsx`

**Interfaces:**
- Consumes: `proveedorSchema`/`ProveedorFormValues` de Task 2, `Proveedor`/`TipoContacto` de Task 2.
- Sin test automatizado (ver Global Constraints). Se verifica manualmente en el Step 3.

- [ ] **Step 1: Crear el componente Textarea**

Crear `src/components/ui/textarea.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
```

- [ ] **Step 2: Actualizar el formulario de proveedor**

Reemplazar el contenido de `src/components/proveedores/formulario-proveedor.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { SelectorCategorias } from '@/components/proveedores/selector-categorias';
import { proveedorSchema, type ProveedorFormValues } from '@/lib/validation/proveedorSchema';
import { crearProveedorAction, actualizarProveedorAction } from '@/app/proveedores/actions';
import { handleActionResult } from '@/lib/handleActionResult';
import type { Categoria, Proveedor, TipoContacto } from '@/types/proveedor';

type FormularioProveedorProps = {
  categorias: Categoria[];
  proveedor?: Proveedor;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ProveedorFormInput = z.input<typeof proveedorSchema>;

const OPCIONES_TIPO_CONTACTO: { value: TipoContacto; label: string }[] = [
  { value: 'telefono', label: 'Teléfono' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'direccion', label: 'Dirección' },
];

function buildDefaultValues(proveedor?: Proveedor): ProveedorFormInput {
  return {
    nombre: proveedor?.nombre ?? '',
    url: proveedor?.url ?? '',
    compraMinima: proveedor?.compraMinima ?? null,
    notas: proveedor?.notas ?? '',
    categoriaIds: proveedor?.categorias.map((c) => c.id) ?? [],
    contactos: proveedor?.contactos.map((c) => ({ tipo: c.tipo, valor: c.valor })) ?? [],
  };
}

export function FormularioProveedor({
  categorias,
  proveedor,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: FormularioProveedorProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const form = useForm<ProveedorFormInput, unknown, ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: buildDefaultValues(proveedor),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'contactos' });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(proveedor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: ProveedorFormValues) {
    const result = proveedor
      ? await actualizarProveedorAction(proveedor.id, values)
      : await crearProveedorAction(values);

    if (!handleActionResult(result, proveedor ? 'Proveedor actualizado' : 'Proveedor creado')) {
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
                    <Input {...field} value={field.value ?? ''} />
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
                      value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Contactos</FormLabel>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <FormField
                      control={form.control}
                      name={`contactos.${index}.tipo`}
                      render={({ field: tipoField }) => (
                        <Select value={tipoField.value} onValueChange={tipoField.onChange}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPCIONES_TIPO_CONTACTO.map((opcion) => (
                              <SelectItem key={opcion.value} value={opcion.value}>
                                {opcion.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`contactos.${index}.valor`}
                      render={({ field: valorField }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...valorField} placeholder="Valor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ tipo: 'telefono', valor: '' })}>
                <Plus />
                Agregar contacto
              </Button>
            </div>
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
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
                      seleccionadas={field.value ?? []}
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

Si `tsc` marca error de tipos en los `name={`contactos.${index}.tipo`}` (los paths de `useFieldArray` a veces necesitan ayuda de inferencia con TypeScript estricto), ajustá con un cast puntual o un tipo explícito en `useFieldArray<ProveedorFormInput, 'contactos'>(...)` — no cambies el comportamiento del formulario para evitarlo.

- [ ] **Step 3: Verificar tipos y manualmente en navegador**

Run: `npx tsc --noEmit`
Expected: sin errores.

Con `npm run dev` corriendo, ir a `/proveedores`, abrir "Nuevo proveedor": agregar 2-3 contactos de distinto tipo, escribir notas, guardar, y confirmar que se creó correctamente (ver el detalle o editar de nuevo para confirmar que los contactos y notas persistieron).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/textarea.tsx src/components/proveedores/formulario-proveedor.tsx
git commit -m "feat: agregar contactos dinámicos y notas al formulario de proveedor"
```

---

### Task 5: Detalle de proveedor — contactos y notas

**Files:**
- Modify: `src/components/proveedores/detalle-proveedor-dialog.tsx`

**Interfaces:**
- Consumes: `Proveedor`/`TipoContacto` de Task 2 (ya incluyen `contactos`/`notas`).

Sin test automatizado (ver Global Constraints).

- [ ] **Step 1: Actualizar el detalle**

Reemplazar el contenido de `src/components/proveedores/detalle-proveedor-dialog.tsx`:

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
import type { Proveedor, TipoContacto } from '@/types/proveedor';

type DetalleProveedorDialogProps = {
  proveedor: Proveedor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditar: (proveedor: Proveedor) => void;
};

const ETIQUETA_TIPO_CONTACTO: Record<TipoContacto, string> = {
  telefono: 'Teléfono',
  whatsapp: 'WhatsApp',
  email: 'Email',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  direccion: 'Dirección',
};

export function DetalleProveedorDialog({
  proveedor,
  open,
  onOpenChange,
  onEditar,
}: DetalleProveedorDialogProps) {
  if (!proveedor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{proveedor.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">URL: </span>
            {proveedor.url ? (
              <a href={proveedor.url} target="_blank" rel="noreferrer" className="underline">
                {proveedor.url}
              </a>
            ) : (
              '—'
            )}
          </div>
          <div>
            <span className="font-medium">Compra mínima: </span>
            {proveedor.compraMinima ?? '—'}
          </div>
          <div>
            <span className="font-medium">Contactos:</span>
            {proveedor.contactos.length === 0 ? (
              <p className="mt-1 text-muted-foreground">—</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {proveedor.contactos.map((contacto) => (
                  <li key={contacto.id}>
                    <span className="text-muted-foreground">{ETIQUETA_TIPO_CONTACTO[contacto.tipo]}: </span>
                    {contacto.valor}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <span className="font-medium">Categorías:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {proveedor.categorias.map((categoria) => (
                <Badge key={categoria.id} variant="secondary">
                  {categoria.nombre}
                </Badge>
              ))}
            </div>
          </div>
          {proveedor.notas ? (
            <div>
              <span className="font-medium">Notas: </span>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{proveedor.notas}</p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={() => onEditar(proveedor)}>Editar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar tipos y manualmente**

Run: `npx tsc --noEmit`
Expected: sin errores.

Con `npm run dev` corriendo, hacer clic en un proveedor con contactos y notas cargadas (el que se creó en la Task 4) y confirmar que se ven correctamente.

- [ ] **Step 3: Commit**

```bash
git add src/components/proveedores/detalle-proveedor-dialog.tsx
git commit -m "feat: mostrar contactos y notas en el detalle de proveedor"
```

---

### Task 6: Tabla, filtros y paginación en `/proveedores`

**Files:**
- Modify: `src/components/proveedores/columnas-proveedores.tsx`
- Create: `src/components/proveedores/filtros-proveedores.tsx`
- Create: `src/components/proveedores/paginador-proveedores.tsx`
- Modify: `src/app/proveedores/page.tsx`

**Interfaces:**
- Consumes: `proveedoresService.buscar(...)` de Task 3, `categoriasService.listar()` (sin cambios).

Sin test automatizado (ver Global Constraints).

- [ ] **Step 1: Quitar la columna de WhatsApp**

Reemplazar el contenido de `src/components/proveedores/columnas-proveedores.tsx`:

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
      cell: ({ row }) =>
        row.original.url ? (
          <a href={row.original.url} target="_blank" rel="noreferrer" className="underline">
            {row.original.url}
          </a>
        ) : (
          '—'
        ),
    },
    { accessorKey: 'compraMinima', header: 'Compra mínima' },
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

- [ ] **Step 2: Crear la barra de filtros**

Antes de escribir este archivo, revisá `node_modules/next/dist/docs/` para confirmar la API de `useRouter`/`usePathname`/`useSearchParams` de `next/navigation` en esta versión de Next.js.

Crear `src/components/proveedores/filtros-proveedores.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Categoria } from '@/types/proveedor';

const TODAS_LAS_CATEGORIAS = 'todas-las-categorias';

type FiltrosProveedoresProps = {
  categorias: Categoria[];
};

export function FiltrosProveedores({ categorias }: FiltrosProveedoresProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '');

  function actualizarParams(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) {
        params.set(clave, valor);
      } else {
        params.delete(clave);
      }
    }
    params.delete('pagina');
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busqueda !== (searchParams.get('q') ?? '')) {
        actualizarParams({ q: busqueda || null });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          className="w-full pl-9 sm:w-64"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>
      <Select
        value={searchParams.get('categoria') ?? TODAS_LAS_CATEGORIAS}
        onValueChange={(value) => actualizarParams({ categoria: value === TODAS_LAS_CATEGORIAS ? null : value })}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Rubro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS_LAS_CATEGORIAS}>Todos los rubros</SelectItem>
          {categorias.map((categoria) => (
            <SelectItem key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 3: Crear el paginador**

Crear `src/components/proveedores/paginador-proveedores.tsx`:

```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

type PaginadorProveedoresProps = {
  paginaActual: number;
  totalPaginas: number;
};

export function PaginadorProveedores({ paginaActual, totalPaginas }: PaginadorProveedoresProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pagina', String(pagina));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Página {paginaActual} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={paginaActual <= 1} onClick={() => irAPagina(paginaActual - 1)}>
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={paginaActual >= totalPaginas}
          onClick={() => irAPagina(paginaActual + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Actualizar la página de proveedores**

Antes de escribir este archivo, revisá `node_modules/next/dist/docs/` para confirmar cómo recibe `searchParams` un Server Component en esta versión de Next.js (en versiones recientes es una `Promise`, pero confirmá contra la documentación instalada).

Reemplazar el contenido de `src/app/proveedores/page.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import { TablaProveedores } from '@/components/proveedores/tabla-proveedores';
import { FiltrosProveedores } from '@/components/proveedores/filtros-proveedores';
import { PaginadorProveedores } from '@/components/proveedores/paginador-proveedores';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { categoriasService } from '@/lib/services/categoriasService';

const TAMAÑO_PAGINA = 50;

type ProveedoresPageProps = {
  searchParams: Promise<{ q?: string; categoria?: string; pagina?: string }>;
};

export default async function ProveedoresPage({ searchParams }: ProveedoresPageProps) {
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);

  const [{ proveedores, total }, categorias] = await Promise.all([
    proveedoresService.buscar({
      pagina,
      tamañoPagina: TAMAÑO_PAGINA,
      busqueda: params.q ?? null,
      categoriaId: params.categoria ?? null,
    }),
    categoriasService.listar(),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / TAMAÑO_PAGINA));

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná los proveedores mayoristas del catálogo.
          </p>
        </div>
        <FormularioProveedor categorias={categorias} trigger={<Button>Nuevo proveedor</Button>} />
      </div>
      <FiltrosProveedores categorias={categorias} />
      <TablaProveedores proveedores={proveedores} categorias={categorias} />
      <PaginadorProveedores paginaActual={pagina} totalPaginas={totalPaginas} />
    </main>
  );
}
```

Si la firma real de `searchParams` en esta versión de Next.js no es una `Promise` (confirmalo en el paso anterior), ajustá la firma de `ProveedoresPageProps` y la lectura de `params` en consecuencia — el resto de la página no cambia.

- [ ] **Step 5: Verificar tipos y manualmente**

Run: `npx tsc --noEmit`
Expected: sin errores.

Run: `npm run test`
Expected: toda la suite sigue en verde (este cambio no toca lógica testeada).

Con `npm run dev` corriendo, ir a `/proveedores`: confirmar que la tabla muestra la primera página, que buscar por nombre filtra tras ~400ms de tipeo, que elegir un rubro filtra correctamente, y que el paginador navega entre páginas (crear varios proveedores de prueba si hay menos de 50 para poder probarlo, o ajustar `TAMAÑO_PAGINA` temporalmente durante la prueba).

- [ ] **Step 6: Commit**

```bash
git add src/components/proveedores/columnas-proveedores.tsx src/components/proveedores/filtros-proveedores.tsx src/components/proveedores/paginador-proveedores.tsx src/app/proveedores/page.tsx
git commit -m "feat: agregar búsqueda, filtro por rubro y paginación a /proveedores"
```
