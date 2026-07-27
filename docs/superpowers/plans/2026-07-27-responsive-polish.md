# Responsive Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 4 views (Inicio, Proveedores, Productos, Gastos) fully usable on mobile — page headers stop overflowing on narrow screens, one action button collapses to an icon, content padding shrinks on small viewports, and the Gastos filter bar stacks full-width instead of wrapping fixed-width controls awkwardly.

**Architecture:** Pure Tailwind class changes gated on the `sm:` breakpoint (640px) — no new components, no JavaScript, no new dependencies beyond one already-available `lucide-react` icon. Everything else in the app (sidebar mobile drawer, table horizontal scroll, dialog/form responsive defaults) already works and is not touched.

**Tech Stack:** Next.js App Router, Tailwind v4, shadcn/ui, Lucide React icons.

## Global Constraints

- Single breakpoint for all changes in this plan: `sm:` (640px) — matches the convention already used by the Inicio KPI grid (`grid-cols-1 sm:grid-cols-2`).
- No new dependencies. `Camera` is already available from the installed `lucide-react` package.
- No automated tests — this is pure CSS/layout, matching this project's established scope (UI composition isn't unit-tested here).
- Copy (titles, subtitles, button labels) does not change — only layout classes.
- Explicitly out of scope, do not touch: `src/components/ui/sidebar.tsx` (mobile drawer already works), `src/components/ui/table.tsx` (horizontal scroll already works, no column-hiding), `src/components/ui/dialog.tsx` and the 3 form components (already responsive by default).

---

### Task 1: Page headers and content padding, all 4 views

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/proveedores/page.tsx`
- Modify: `src/app/productos/page.tsx`
- Modify: `src/app/gastos/page.tsx`

**Interfaces:** None — these are leaf page components, nothing downstream consumes their internals.

No test — UI layout only. Verify with `npm run build`.

- [ ] **Step 1: Update `src/app/page.tsx` (padding only — no action button in this header, nothing to wrap)**

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
    <main className="space-y-6 p-4 sm:p-6">
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

- [ ] **Step 2: Update `src/app/proveedores/page.tsx` (padding + header wrapper)**

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
      <TablaProveedores proveedores={proveedores} categorias={categorias} />
    </main>
  );
}
```

- [ ] **Step 3: Update `src/app/productos/page.tsx` (padding + header wrapper)**

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
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

- [ ] **Step 4: Update `src/app/gastos/page.tsx` (padding + header wrapper)**

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
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

- [ ] **Step 5: Verify the build and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run build
git add src/app/page.tsx src/app/proveedores/page.tsx src/app/productos/page.tsx src/app/gastos/page.tsx
git commit -m "feat: make page headers and content padding responsive"
```

Expected: `✓ Compiled successfully`, same 4 routes as before.

---

### Task 2: Collapse "Nuevo producto desde foto" to an icon on mobile

**Files:**
- Modify: `src/components/productos/nuevo-producto-desde-foto.tsx`

**Interfaces:** None — this component's props (`proveedores`, `categorias`) and its usage in `productos/page.tsx` (Task 1) are unchanged.

No test — UI composition. Verify with `npx tsc --noEmit`.

- [ ] **Step 1: Update `src/components/productos/nuevo-producto-desde-foto.tsx`**

Adds a `Camera` icon (always visible) and hides the text label below the `sm:` breakpoint. The `Button`'s own base styles already apply a `gap-1.5` between flex children, so no manual margin is needed between the icon and the text. A fixed `aria-label` keeps the button's accessible name identical to the visible desktop label regardless of which breakpoint is active, so screen reader users always get the full label even when the visible text is hidden on mobile:

```tsx
'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
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

  const valoresIniciales = datosDesdeFoto
    ? { ...datosDesdeFoto, nombre: datosDesdeFoto.nombre ?? '' }
    : undefined;

  return (
    <>
      <DialogoFotoProducto
        trigger={
          <Button variant="outline" aria-label="Nuevo producto desde foto">
            <Camera />
            <span className="hidden sm:inline">Nuevo producto desde foto</span>
          </Button>
        }
        onDatosExtraidos={setDatosDesdeFoto}
      />
      <FormularioProducto
        proveedores={proveedores}
        categorias={categorias}
        valoresIniciales={valoresIniciales}
        open={datosDesdeFoto !== null}
        onOpenChange={(open) => {
          if (!open) setDatosDesdeFoto(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx tsc --noEmit
git add src/components/productos/nuevo-producto-desde-foto.tsx
git commit -m "feat: collapse photo-upload button to an icon on mobile"
```

---

### Task 3: Gastos filter bar — full-width controls on mobile

**Files:**
- Modify: `src/components/gastos/filtros-gastos.tsx`
- Modify: `src/components/gastos/listado-gastos.tsx`

**Interfaces:** None — `FiltrosGastos`'s props (`personas`, `categorias`, `filtros`, `onFiltrosChange`) and `ListadoGastos`'s props are unchanged; only internal layout classes change.

No test — UI composition. Verify with `npx tsc --noEmit`.

- [ ] **Step 1: Update `src/components/gastos/filtros-gastos.tsx`**

The container switches from an always-wrapping row to a column on mobile (`sm:` and up restores the current wrapped-row behavior), and each control goes from a fixed width to full-width below `sm:`:

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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function deFechaISO(fechaISO: string): Date {
  const [year, month, day] = fechaISO.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function FiltrosGastos({ personas, categorias, filtros, onFiltrosChange }: FiltrosGastosProps) {
  const rango: DateRange | undefined = filtros.desde
    ? { from: deFechaISO(filtros.desde), to: filtros.hasta ? deFechaISO(filtros.hasta) : undefined }
    : undefined;

  function handleRangoChange(nuevoRango: DateRange | undefined) {
    onFiltrosChange({
      ...filtros,
      desde: nuevoRango?.from ? aFechaISO(nuevoRango.from) : null,
      hasta: nuevoRango?.to ? aFechaISO(nuevoRango.to) : null,
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        value={filtros.personaId ?? TODAS_LAS_PERSONAS}
        onValueChange={(value) =>
          onFiltrosChange({ ...filtros, personaId: value === TODAS_LAS_PERSONAS ? null : value })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
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
        <SelectTrigger className="w-full sm:w-48">
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
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at">Fecha de creación</SelectItem>
          <SelectItem value="updated_at">Fecha de actualización</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start font-normal sm:w-64">
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

- [ ] **Step 2: Update `src/components/gastos/listado-gastos.tsx`**

The outer wrapper that puts the filter bar and the record counter side by side switches to a column on mobile too, and the counter's `ml-auto` (which only makes sense in a row layout) becomes conditional on `sm:`:

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FiltrosGastos personas={personas} categorias={categorias} filtros={filtros} onFiltrosChange={setFiltros} />
        <div className="text-sm text-muted-foreground sm:ml-auto">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />
          {gastosFiltrados.length} {gastosFiltrados.length === 1 ? 'gasto' : 'gastos'}
        </div>
      </div>
      <TablaGastos gastos={gastosFiltrados} personas={personas} categorias={categorias} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npx tsc --noEmit
git add src/components/gastos/filtros-gastos.tsx src/components/gastos/listado-gastos.tsx
git commit -m "feat: make gastos filter bar full-width on mobile"
```

---

### Task 4: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd "C:\Users\Mauri\OneDrive\Escritorio\MercadoLibre"
npm run test
```

Expected: all pre-existing tests still pass (this plan adds no new tests, since it touches no business logic — only layout classes).

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`, same 4 routes as before (`/`, `/gastos`, `/productos`, `/proveedores`).

- [ ] **Step 3: Run the linter**

```bash
npm run lint
```

Expected: no new errors beyond the two pre-existing, unrelated findings already present before this branch (`src/hooks/use-mobile.ts`, `src/components/ui/data-table.tsx`).

- [ ] **Step 4: Manual smoke test at multiple viewport widths**

```bash
npm run dev
```

Open the app in a browser and use devtools' device toolbar (or manually resize the window) to check at roughly 375px (mobile), 768px (tablet), and 1280px (desktop) on all 4 views:
- Page headers: title stacks above the action button(s) below 640px, sits side-by-side with them from 640px up.
- `/productos`: the "Nuevo producto desde foto" button shows only a camera icon below 640px, and the full label from 640px up; both states remain clickable and open the photo dialog.
- Content padding is visibly tighter on the narrow viewport and returns to the previous spacing from 640px up.
- `/gastos`: the 3 selects and the date-range button stack full-width in a column below 640px, and return to the current wrapped-row layout with fixed widths from 640px up. The record counter sits below the filters on mobile instead of squeezed onto the same row.
- Confirm nothing already-working regressed: the sidebar still opens as a drawer on mobile, tables still scroll horizontally, dialogs and forms still look correct.

- [ ] **Step 5: Push the branch (do not open a PR yet — hand back to the user first)**

```bash
git push -u origin feature/responsive-polish
```
