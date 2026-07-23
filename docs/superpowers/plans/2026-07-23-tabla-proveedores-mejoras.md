# Tabla Proveedores Mejoras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only detail modal that opens when clicking a proveedor row, and a skeleton loading state for the `/proveedores` table.

**Architecture:** A generic `onRowClick` prop on `DataTable` drives a new `DetalleProveedorDialog` component controlled from `TablaProveedores`'s local state; the existing "Acciones" cell stops click propagation so its buttons don't also trigger the row click. A Next.js `loading.tsx` file provides the skeleton via the App Router's built-in Suspense convention — no client-side loading state needed.

**Tech Stack:** Next.js App Router (`loading.tsx` convention), React state, shadcn/ui (`Dialog`, `Skeleton`, `Badge`, `Button` — all already installed), TanStack Table (already in use via `DataTable`).

## Global Constraints

- No changes to `src/lib/services/*`, `src/app/proveedores/actions.ts`, or the data model — this is UI-only work on top of the existing proveedores feature.
- The detail modal shows only the proveedor's own fields (nombre, url, compraMinima, whatsapp, categorias) — no product data (products don't exist yet in this codebase).
- No automated tests required (per this project's established testing scope: only `src/lib/services/*` gets tests); verification is manual + build/tsc.
- TypeScript strict, no `any`, no `@ts-ignore`. Only shadcn/ui components for interactive UI elements.
- Clicking the existing "Editar"/"Eliminar" buttons in the Acciones column must NOT also open the detail modal.

---

### Task 1: Detail modal on row click

**Files:**
- Create: `src/components/proveedores/detalle-proveedor-dialog.tsx`
- Modify: `src/components/ui/data-table.tsx`
- Modify: `src/components/proveedores/tabla-proveedores.tsx`
- Modify: `src/components/proveedores/columnas-proveedores.tsx`

**Interfaces:**
- Produces: `DataTable`'s new optional prop `onRowClick?: (row: TData) => void`.
- Produces: `DetalleProveedorDialog({ proveedor: Proveedor | null; categorias: Categoria[]; open: boolean; onOpenChange: (open: boolean) => void })`.
- Consumes: `Proveedor`/`Categoria` types from `src/types/proveedor.ts`, `FormularioProveedor` from `src/components/proveedores/formulario-proveedor.tsx` (reused, unmodified, as the "Editar" action inside the new dialog).

- [ ] **Step 1: Add `onRowClick` to the generic `DataTable`**

Replace the full content of `src/components/ui/data-table.tsx`:

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

type DataTableProps<TData extends { id: string }, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
};

export function DataTable<TData extends { id: string }, TValue>({
  columns,
  data,
  emptyMessage = 'Sin resultados',
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
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

(Only the `onRowClick` prop and its use on `<TableRow>` are new — everything else is unchanged from the current file.)

- [ ] **Step 2: Create the read-only detail dialog**

`src/components/proveedores/detalle-proveedor-dialog.tsx`:

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
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import type { Categoria, Proveedor } from '@/types/proveedor';

type DetalleProveedorDialogProps = {
  proveedor: Proveedor | null;
  categorias: Categoria[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DetalleProveedorDialog({
  proveedor,
  categorias,
  open,
  onOpenChange,
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
            <a href={proveedor.url} target="_blank" rel="noreferrer" className="underline">
              {proveedor.url}
            </a>
          </div>
          <div>
            <span className="font-medium">Compra mínima: </span>
            {proveedor.compraMinima ?? '—'}
          </div>
          <div>
            <span className="font-medium">WhatsApp: </span>
            {proveedor.whatsapp ?? '—'}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <FormularioProveedor
            categorias={categorias}
            proveedor={proveedor}
            trigger={
              <Button onClick={() => onOpenChange(false)}>Editar</Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire row click + dialog state into `TablaProveedores`**

Replace the full content of `src/components/proveedores/tabla-proveedores.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { crearColumnas } from '@/components/proveedores/columnas-proveedores';
import { DetalleProveedorDialog } from '@/components/proveedores/detalle-proveedor-dialog';
import type { Categoria, Proveedor } from '@/types/proveedor';

type TablaProveedoresProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function TablaProveedores({ proveedores, categorias }: TablaProveedoresProps) {
  const columns = useMemo(() => crearColumnas(categorias), [categorias]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);

  return (
    <>
      <DataTable
        columns={columns}
        data={proveedores}
        emptyMessage="No hay proveedores cargados"
        onRowClick={setProveedorSeleccionado}
      />
      <DetalleProveedorDialog
        proveedor={proveedorSeleccionado}
        categorias={categorias}
        open={proveedorSeleccionado !== null}
        onOpenChange={(open) => {
          if (!open) setProveedorSeleccionado(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: Stop the Acciones column's clicks from bubbling to the row**

In `src/components/proveedores/columnas-proveedores.tsx`, find the `acciones` column's `cell` function:

```tsx
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
          <BotonEliminarProveedor proveedorId={row.original.id} proveedorNombre={row.original.nombre} />
        </div>
      ),
    },
```

Change only the wrapping `<div>`'s opening tag to add a click handler that stops propagation:

```tsx
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
```

Nothing else in this file changes.

- [ ] **Step 5: Verify**

```bash
npm run build
```

Expected: `Compiled successfully`.

```bash
npx tsc --noEmit
```

Expected: clean.

```bash
grep -rn "any\|@ts-ignore" src/components/proveedores/detalle-proveedor-dialog.tsx src/components/ui/data-table.tsx src/components/proveedores/tabla-proveedores.tsx src/components/proveedores/columnas-proveedores.tsx
```

Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add read-only detail dialog on proveedor row click"
```

---

### Task 2: Skeleton while /proveedores loads

**Files:**
- Create: `src/app/proveedores/loading.tsx`

**Interfaces:**
- None — this is a Next.js App Router convention file, automatically rendered by the framework while the sibling `page.tsx`'s async data resolves. No other file needs to import or reference it.

- [ ] **Step 1: Create the skeleton fallback**

`src/app/proveedores/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function ProveedoresLoading() {
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
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-40" />
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
```

Expected: `Compiled successfully`, and the route list shows `/proveedores` with an associated loading segment (Next.js notes this in the build output when a `loading.tsx` sibling exists).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add skeleton loading state for proveedores table"
```

---

### Task 3: Manual verification and push

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server (if not already running)**

```bash
npm run dev
```

- [ ] **Step 2: Manual test pass on `http://localhost:3000/proveedores`**

- Click anywhere on a proveedor's row (not on the Editar/Eliminar buttons) — the detail dialog opens showing that proveedor's nombre, URL, compra mínima, WhatsApp, and category badges.
- Click "Editar" inside the detail dialog — the detail dialog closes and the edit form dialog opens, pre-filled with that same proveedor's current data.
- Close the detail dialog via "Cerrar" — it closes with no side effects.
- Click "Editar" or "Eliminar" directly in the Acciones column (without first opening the detail dialog) — only the expected action happens; the detail dialog does NOT also open.
- In browser devtools, throttle the network (e.g. "Slow 3G") and reload `/proveedores` — a skeleton table shape appears briefly before the real data renders.

- [ ] **Step 3: Run the full test suite and build one more time**

```bash
npm test
npm run build
```

Expected: all existing tests still pass, build succeeds.

- [ ] **Step 4: Push**

```bash
git push origin feature/listado-proveedores
```

Expected: branch updated on `https://github.com/martinezmauri/mercadolibre-proveedores`.
