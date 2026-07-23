# Carga de producto desde foto (IA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Nuevo producto desde foto" flow to `/productos`: upload a photo, get it stored in Supabase Storage, send it to Claude Haiku 4.5 for structured extraction of `{nombre, precio, categoria}`, and hand the result to the existing product form for review before saving.

**Architecture:** Two new isolated services (`almacenamientoService` for Supabase Storage upload, `extraccionProductoService` for the Claude vision call) sit behind one new thin Server Action (`analizarFotoProductoAction`) that the existing Server Action / service layering pattern already establishes. Two small client components (`DialogoFotoProducto` for the upload step, `NuevoProductoDesdeFoto` for coordinating the hand-off) reuse the existing `FormularioProducto` for review and save — no new save path, no schema changes to `productos`.

**Tech Stack:** Next.js Server Actions, Supabase Storage, `@anthropic-ai/sdk` (Claude Haiku 4.5, structured outputs via `zodOutputFormat`), Zod, React Hook Form, Vitest.

## Global Constraints

- Model: `claude-haiku-4-5` (exact ID) — do not substitute another model.
- Storage bucket name: `productos` (Supabase Storage), created as **public** (`public: true`) — no RLS policies needed, same as the DB tables, because all access goes through the server-side secret key.
- Max upload size: **10 MB** — reject larger files client-side in the Server Action before any upload/API call, with a clear error message.
- Allowed image types: `image/jpeg`, `image/png`, `image/webp`, `image/gif` only — reject anything else (e.g. HEIC) with a clear error message.
- The price the AI extracts always maps to **`precioMayor`** (precio por mayor) — never `precioMenor`. `precioMenor`, `proveedorId`, and `url` (URL del producto) are never populated by the AI; the user always fills those by hand.
- If the AI can't confidently read a field, it must return `null` for that field (not a guess) — the corresponding form field stays empty for manual completion.
- `ANTHROPIC_API_KEY` is read server-side only (`new Anthropic()` with no args resolves it from the environment) — never imported into a client component.
- No new automated UI tests — this project's testing scope is services only (`src/lib/services/*`), consistent with every prior sub-project here. New services DO get tests (TDD, mocked externals).
- No `any` / `@ts-ignore` anywhere (project-wide rule already enforced elsewhere in this codebase).

---

### Task 1: Supabase Storage bucket + `almacenamientoService`

**Files:**
- Create: `supabase/migrations/20260723160000_productos_storage_bucket.sql`
- Create: `src/lib/services/almacenamientoService.ts`
- Test: `src/lib/services/almacenamientoService.test.ts`

**Interfaces:**
- Produces: `almacenamientoService.subirImagenProducto(buffer: Buffer, mimeType: string): Promise<string>` — uploads to the `productos` bucket and returns the public URL. Later tasks call this exactly.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260723160000_productos_storage_bucket.sql
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply the migration to the Supabase project**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with:
- `project_id`: `vngsqjzlmqcpxlxtkbel`
- `name`: `productos_storage_bucket`
- `query`: the SQL from Step 1

Confirm it succeeds (no error returned).

- [ ] **Step 3: Write the failing tests**

```typescript
// src/lib/services/almacenamientoService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { almacenamientoService } from './almacenamientoService';

const mockedCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;

describe('almacenamientoService', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  describe('subirImagenProducto', () => {
    it('sube el archivo y devuelve la URL pública', async () => {
      const upload = vi.fn().mockResolvedValue({ data: { path: 'abc.jpg' }, error: null });
      const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://ejemplo.com/abc.jpg' } });
      const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
      mockedCreateClient.mockReturnValue({ storage: { from } });

      const url = await almacenamientoService.subirImagenProducto(Buffer.from('foto'), 'image/jpeg');

      expect(url).toBe('https://ejemplo.com/abc.jpg');
      expect(from).toHaveBeenCalledWith('productos');
      expect(upload).toHaveBeenCalledWith(expect.stringMatching(/\.jpg$/), expect.any(Buffer), {
        contentType: 'image/jpeg',
      });
    });

    it('lanza un error legible si Supabase Storage falla', async () => {
      const upload = vi.fn().mockResolvedValue({ data: null, error: { message: 'bucket no encontrado' } });
      const getPublicUrl = vi.fn();
      const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
      mockedCreateClient.mockReturnValue({ storage: { from } });

      await expect(
        almacenamientoService.subirImagenProducto(Buffer.from('foto'), 'image/png')
      ).rejects.toThrow('No se pudo subir la imagen: bucket no encontrado');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/services/almacenamientoService.test.ts`
Expected: FAIL — `almacenamientoService.ts` does not exist yet.

- [ ] **Step 3: Implement `almacenamientoService`**

```typescript
// src/lib/services/almacenamientoService.ts
import { randomUUID } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';

const BUCKET = 'productos';

function extensionFromMimeType(mimeType: string): string {
  const subtype = mimeType.split('/')[1] ?? 'jpg';
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

export const almacenamientoService = {
  async subirImagenProducto(buffer: Buffer, mimeType: string): Promise<string> {
    const supabase = createSupabaseServerClient();
    const path = `${randomUUID()}.${extensionFromMimeType(mimeType)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: mimeType,
    });
    throwOnSupabaseError(error, 'No se pudo subir la imagen');

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/almacenamientoService.test.ts`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260723160000_productos_storage_bucket.sql src/lib/services/almacenamientoService.ts src/lib/services/almacenamientoService.test.ts
git commit -m "feat: add Supabase Storage bucket and almacenamientoService for product photos"
```

---

### Task 2: `extraccionProductoService` (Claude Haiku 4.5 vision call)

**Files:**
- Modify: `src/types/producto.ts` — add `DatosExtraidosProducto`
- Create: `src/lib/validation/extraccionProductoSchema.ts`
- Create: `src/lib/services/extraccionProductoService.ts`
- Test: `src/lib/services/extraccionProductoService.test.ts`
- Modify: `package.json` (add `@anthropic-ai/sdk`)

**Interfaces:**
- Consumes: `Categoria` from `@/types/proveedor` (`{id: string; nombre: string}`, already exists).
- Produces: `DatosExtraidosProducto` type (`src/types/producto.ts`), `ImagenMimeType` type and `extraccionProductoService.extraerDatosProducto(imageBase64: string, mimeType: ImagenMimeType, categorias: Categoria[]): Promise<DatosExtraidosProducto>` (`src/lib/services/extraccionProductoService.ts`) — Task 3 calls this exactly.

- [ ] **Step 1: Install the Anthropic SDK**

Run: `npm install @anthropic-ai/sdk`

- [ ] **Step 2: Add `DatosExtraidosProducto` to the producto types**

```typescript
// src/types/producto.ts — add at the end of the file
export type DatosExtraidosProducto = {
  nombre: string | null;
  precioMayor: number | null;
  categoriaId: string | null;
};
```

- [ ] **Step 3: Create the Zod schema for the AI's structured response**

```typescript
// src/lib/validation/extraccionProductoSchema.ts
import { z } from 'zod';

export const extraccionProductoSchema = z.object({
  nombre: z.string().nullable(),
  precio: z.number().nullable(),
  categoria: z.string().nullable(),
});

export type ExtraccionProducto = z.infer<typeof extraccionProductoSchema>;
```

- [ ] **Step 4: Write the failing tests**

```typescript
// src/lib/services/extraccionProductoService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const parseMock = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { parse: parseMock },
  })),
}));

vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: vi.fn().mockReturnValue({}),
}));

import { extraccionProductoService } from './extraccionProductoService';

const CATEGORIAS = [
  { id: 'cat-1', nombre: 'Electrónica' },
  { id: 'cat-2', nombre: 'Hogar' },
];

describe('extraccionProductoService', () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  describe('extraerDatosProducto', () => {
    it('mapea la categoría devuelta (case-insensitive) a su ID real', async () => {
      parseMock.mockResolvedValue({
        parsed_output: { nombre: 'Auriculares Bluetooth', precio: 15000, categoria: 'electrónica' },
      });

      const resultado = await extraccionProductoService.extraerDatosProducto('base64==', 'image/jpeg', CATEGORIAS);

      expect(resultado).toEqual({ nombre: 'Auriculares Bluetooth', precioMayor: 15000, categoriaId: 'cat-1' });
    });

    it('devuelve categoriaId null si la IA no reconoce ninguna categoría de la lista', async () => {
      parseMock.mockResolvedValue({
        parsed_output: { nombre: 'Producto genérico', precio: 500, categoria: 'Inexistente' },
      });

      const resultado = await extraccionProductoService.extraerDatosProducto('base64==', 'image/png', CATEGORIAS);

      expect(resultado.categoriaId).toBeNull();
    });

    it('devuelve todos los campos null si el parseo estructurado falla', async () => {
      parseMock.mockResolvedValue({ parsed_output: null });

      const resultado = await extraccionProductoService.extraerDatosProducto('base64==', 'image/jpeg', CATEGORIAS);

      expect(resultado).toEqual({ nombre: null, precioMayor: null, categoriaId: null });
    });
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npx vitest run src/lib/services/extraccionProductoService.test.ts`
Expected: FAIL — `extraccionProductoService.ts` does not exist yet.

- [ ] **Step 6: Implement `extraccionProductoService`**

```typescript
// src/lib/services/extraccionProductoService.ts
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { extraccionProductoSchema } from '@/lib/validation/extraccionProductoSchema';
import type { Categoria } from '@/types/proveedor';
import type { DatosExtraidosProducto } from '@/types/producto';

export type ImagenMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

function construirPrompt(categorias: Categoria[]): string {
  const nombresCategorias = categorias.map((categoria) => categoria.nombre).join(', ');
  return `Esta es una foto de un producto o su cartel de precio, tomada en el catálogo o depósito de un proveedor mayorista. Si la foto muestra varios productos o varios precios, enfocate en el producto principal o más destacado. Extraé:
- nombre: el nombre o título del producto tal como aparece en la foto.
- precio: el precio numérico que el proveedor le cobra por ese producto (sin símbolo de moneda ni separadores de miles).
- categoria: la categoría que mejor describe el producto, eligiendo EXACTAMENTE uno de estos nombres: ${nombresCategorias}.

Si no podés leer o inferir alguno de estos datos con confianza, devolvé null en ese campo en vez de adivinar. No inventes una categoría que no esté en la lista.`;
}

export const extraccionProductoService = {
  async extraerDatosProducto(
    imageBase64: string,
    mimeType: ImagenMimeType,
    categorias: Categoria[],
  ): Promise<DatosExtraidosProducto> {
    const client = new Anthropic();

    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            { type: 'text', text: construirPrompt(categorias) },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(extraccionProductoSchema) },
    });

    const resultado = response.parsed_output;
    if (!resultado) {
      return { nombre: null, precioMayor: null, categoriaId: null };
    }

    const categoriaCoincidente = categorias.find(
      (categoria) => categoria.nombre.toLowerCase() === resultado.categoria?.toLowerCase(),
    );

    return {
      nombre: resultado.nombre,
      precioMayor: resultado.precio,
      categoriaId: categoriaCoincidente?.id ?? null,
    };
  },
};
```

If TypeScript flags `media_type: mimeType` as a type mismatch, check the exact accepted union in `node_modules/@anthropic-ai/sdk`'s image source type and narrow `ImagenMimeType` to match it exactly — don't reach for `as`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/extraccionProductoService.test.ts`
Expected: PASS (3/3)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/types/producto.ts src/lib/validation/extraccionProductoSchema.ts src/lib/services/extraccionProductoService.ts src/lib/services/extraccionProductoService.test.ts
git commit -m "feat: add extraccionProductoService using Claude Haiku 4.5 vision"
```

---

### Task 3: `analizarFotoProductoAction` Server Action

**Files:**
- Modify: `src/app/productos/actions.ts`

**Interfaces:**
- Consumes: `almacenamientoService.subirImagenProducto` (Task 1), `extraccionProductoService.extraerDatosProducto` + `ImagenMimeType` (Task 2), `categoriasService.listar()` (existing), `DatosExtraidosProducto` (Task 2).
- Produces: `AnalisisFotoResult` type and `analizarFotoProductoAction(formData: FormData): Promise<AnalisisFotoResult>` — Task 5's `DialogoFotoProducto` calls this exactly.

No new automated tests for this task — this project's existing Server Actions (`crearProductoAction`, etc.) are intentionally thin and untested; business logic lives in the services tested in Tasks 1 and 2.

- [ ] **Step 1: Add the action**

```typescript
// src/app/productos/actions.ts — add these imports at the top, alongside the existing ones
import { almacenamientoService } from '@/lib/services/almacenamientoService';
import { categoriasService } from '@/lib/services/categoriasService';
import { extraccionProductoService, type ImagenMimeType } from '@/lib/services/extraccionProductoService';
import type { DatosExtraidosProducto } from '@/types/producto';
```

```typescript
// src/app/productos/actions.ts — add at the end of the file
const TAMANIO_MAXIMO_BYTES = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function esImagenMimeTypeValido(tipo: string): tipo is ImagenMimeType {
  return TIPOS_PERMITIDOS.includes(tipo);
}

export type AnalisisFotoResult =
  | { success: true; data: DatosExtraidosProducto & { imagenUrl: string } }
  | { success: false; error: string };

export async function analizarFotoProductoAction(formData: FormData): Promise<AnalisisFotoResult> {
  const archivo = formData.get('foto');
  if (!(archivo instanceof File)) {
    return { success: false, error: 'No se recibió ninguna foto' };
  }

  if (archivo.size > TAMANIO_MAXIMO_BYTES) {
    return { success: false, error: 'La foto no puede pesar más de 10 MB' };
  }

  if (!esImagenMimeTypeValido(archivo.type)) {
    return { success: false, error: 'Formato de imagen no soportado. Usá JPG, PNG, WEBP o GIF.' };
  }

  const mimeType = archivo.type;

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const [imagenUrl, categorias] = await Promise.all([
      almacenamientoService.subirImagenProducto(buffer, mimeType),
      categoriasService.listar(),
    ]);

    const datos = await extraccionProductoService.extraerDatosProducto(
      buffer.toString('base64'),
      mimeType,
      categorias,
    );

    return { success: true, data: { ...datos, imagenUrl } };
  } catch (error) {
    console.error('Error al analizar foto de producto:', error);
    return {
      success: false,
      error: 'No se pudo analizar la foto. Intentá de nuevo o cargá el producto manualmente.',
    };
  }
}
```

- [ ] **Step 2: Confirm nothing broke**

Run: `npm run build` and `npm test`
Expected: both succeed — this task adds a new exported function without touching existing ones.

- [ ] **Step 3: Commit**

```bash
git add src/app/productos/actions.ts
git commit -m "feat: add analizarFotoProductoAction wiring storage upload and AI extraction"
```

---

### Task 4: `FormularioProducto` pre-fill support

**Files:**
- Modify: `src/components/productos/formulario-producto.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: new optional prop `valoresIniciales?: Partial<ProductoFormInput>` on `FormularioProducto` — Task 5's `NuevoProductoDesdeFoto` passes this.

- [ ] **Step 1: Add the prop and merge it into the default values**

```typescript
// src/components/productos/formulario-producto.tsx
// Replace the existing FormularioProductoProps type and buildDefaultValues function with:

type FormularioProductoProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
  producto?: Producto;
  valoresIniciales?: Partial<ProductoFormInput>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ProductoFormInput = z.input<typeof productoSchema>;

function buildDefaultValues(producto?: Producto, valoresIniciales?: Partial<ProductoFormInput>): ProductoFormInput {
  if (producto) {
    return {
      proveedorId: producto.proveedorId,
      categoriaId: producto.categoriaId,
      nombre: producto.nombre,
      url: producto.url,
      imagenUrl: producto.imagenUrl,
      precioMenor: producto.precioMenor,
      precioMayor: producto.precioMayor,
    };
  }

  return {
    proveedorId: '',
    categoriaId: null,
    nombre: '',
    url: '',
    imagenUrl: null,
    precioMenor: null,
    precioMayor: null,
    ...valoresIniciales,
  };
}
```

Note: `ProductoFormInput` is already declared in this file before `buildDefaultValues` today — keep it in the same place, only the function below it changes shape.

- [ ] **Step 2: Thread the new prop through the component**

```typescript
// src/components/productos/formulario-producto.tsx
// Replace the FormularioProducto function signature and the two buildDefaultValues call sites:

export function FormularioProducto({
  proveedores,
  categorias,
  producto,
  valoresIniciales,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: FormularioProductoProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const form = useForm<ProductoFormInput, unknown, ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: buildDefaultValues(producto, valoresIniciales),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(producto, valoresIniciales));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
```

The rest of the component (submit handler, JSX form fields) stays exactly as it is today.

- [ ] **Step 3: Confirm nothing broke**

Run: `npm run build` and `npm test`
Expected: both succeed — existing create/edit behavior is unchanged since `valoresIniciales` is optional and only spread in the no-`producto` branch.

- [ ] **Step 4: Commit**

```bash
git add src/components/productos/formulario-producto.tsx
git commit -m "feat: let FormularioProducto accept pre-filled initial values"
```

---

### Task 5: `DialogoFotoProducto` + `NuevoProductoDesdeFoto` + wire into `/productos`

**Files:**
- Create: `src/components/productos/dialogo-foto-producto.tsx`
- Create: `src/components/productos/nuevo-producto-desde-foto.tsx`
- Modify: `src/app/productos/page.tsx`

**Interfaces:**
- Consumes: `analizarFotoProductoAction` (Task 3), `FormularioProducto` with `valoresIniciales` (Task 4), `DatosExtraidosProducto` (Task 2).
- Produces: the "Nuevo producto desde foto" button on `/productos`.

- [ ] **Step 1: Create `DialogoFotoProducto`**

```typescript
// src/components/productos/dialogo-foto-producto.tsx
'use client';

import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { analizarFotoProductoAction } from '@/app/productos/actions';
import type { DatosExtraidosProducto } from '@/types/producto';

type DialogoFotoProductoProps = {
  trigger: React.ReactNode;
  onDatosExtraidos: (datos: DatosExtraidosProducto & { imagenUrl: string }) => void;
};

export function DialogoFotoProducto({ trigger, onDatosExtraidos }: DialogoFotoProductoProps) {
  const [open, setOpen] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  function analizar() {
    if (!archivo) {
      toast.error('Elegí una foto primero');
      return;
    }

    const formData = new FormData();
    formData.set('foto', archivo);

    startTransition(async () => {
      const resultado = await analizarFotoProductoAction(formData);
      if (!resultado.success) {
        toast.error(resultado.error);
        return;
      }

      onDatosExtraidos(resultado.data);
      setOpen(false);
      setArchivo(null);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setArchivo(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto desde foto</DialogTitle>
        </DialogHeader>
        <Input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={isPending}
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
        <DialogFooter>
          <Button type="button" onClick={analizar} disabled={isPending || !archivo}>
            {isPending ? 'Analizando...' : 'Analizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `NuevoProductoDesdeFoto`**

```typescript
// src/components/productos/nuevo-producto-desde-foto.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogoFotoProducto } from '@/components/productos/dialogo-foto-producto';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { DatosExtraidosProducto } from '@/types/producto';

type NuevoProductoDesdeFotoProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

type DatosFoto = DatosExtraidosProducto & { imagenUrl: string };

export function NuevoProductoDesdeFoto({ proveedores, categorias }: NuevoProductoDesdeFotoProps) {
  const [datosDesdeFoto, setDatosDesdeFoto] = useState<DatosFoto | null>(null);

  return (
    <>
      <DialogoFotoProducto
        trigger={<Button variant="outline">Nuevo producto desde foto</Button>}
        onDatosExtraidos={setDatosDesdeFoto}
      />
      <FormularioProducto
        proveedores={proveedores}
        categorias={categorias}
        valoresIniciales={datosDesdeFoto ?? undefined}
        open={datosDesdeFoto !== null}
        onOpenChange={(open) => {
          if (!open) setDatosDesdeFoto(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 3: Wire the button into the page**

```typescript
// src/app/productos/page.tsx — full replacement
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
        <h1 className="text-4xl font-semibold">Productos</h1>
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

- [ ] **Step 4: Confirm nothing broke**

Run: `npm run build` and `npm test`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/components/productos/dialogo-foto-producto.tsx src/components/productos/nuevo-producto-desde-foto.tsx src/app/productos/page.tsx
git commit -m "feat: add photo-based product creation entry point to /productos"
```

---

### Task 6: Manual verification and push

**Files:** none (verification only).

- [ ] **Step 1: Confirm the environment is ready**

Confirm `ANTHROPIC_API_KEY` is set in `.env.local` and that the Anthropic Console account has credit loaded (the user handled key generation and billing outside this plan).

- [ ] **Step 2: Run the full automated suite**

Run: `npm test` — expect all suites green, including Tasks 1–2's new tests.
Run: `npm run build` — expect a clean production build.

- [ ] **Step 3: Manual browser verification**

Start the dev server (`npm run dev`) and on `/productos`:
1. Click "Nuevo producto desde foto", pick a real product photo, click "Analizar" — confirm it either shows an error (if credit/key isn't ready) or opens the product form pre-filled with a plausible nombre/precio por mayor/categoría and the uploaded photo's URL in the imagen field.
2. Confirm proveedor, URL del producto, and precio por menor are empty and must be filled by hand.
3. Complete the missing fields and save — confirm the new producto appears in the table with the uploaded image URL.
4. Confirm "Nuevo producto" (manual flow, no photo) still works unchanged.
5. Confirm `/proveedores` still works unchanged (no regressions from this branch's earlier work).

- [ ] **Step 4: Push the branch**

```bash
git push origin feature/listado-proveedores
```

This pushes every commit accumulated on the branch so far (sidebar redesign, table improvements, productos, and this photo-extraction feature).
