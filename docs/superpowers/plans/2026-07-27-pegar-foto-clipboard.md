# Pegar Foto desde el Portapapeles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir pegar (Ctrl+V) una imagen copiada al portapapeles dentro del diálogo "Nuevo producto desde foto", como alternativa al input de archivo existente, con preview antes de analizar.

**Architecture:** Una función pura (`extraerImagenDeClipboard`) extrae el `File` de imagen de los items del portapapeles. Un componente presentacional nuevo (`SelectorFotoProducto`) encapsula el input de archivo + el recuadro de pegado + el preview, y expone `archivo`/`onArchivoChange`/`disabled` como única interfaz. `DialogoFotoProducto` pasa a usar ese componente en vez del `<Input type="file">` inline, sin cambiar su lógica de análisis.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estricto, Tailwind v4, shadcn/ui, Lucide React, Vitest.

## Global Constraints

- Fuente Inter, paleta rosa/pink, iconos Lucide en `h-4 w-4` — ver `docs/DESIGN_SYSTEM.md`.
- No hay tests de componentes React en este proyecto (ni jsdom configurado — `vitest.config.ts` usa `environment: 'node'`). Solo se testea lógica pura (services, actions, validación, funciones como `filtrarGastos`). El componente `SelectorFotoProducto` y el cambio en `DialogoFotoProducto` NO llevan test automatizado; se verifican manualmente en navegador.
- El recuadro de pegado convive con el input de archivo — no lo reemplaza.
- Si se pega algo que no es una imagen, se ignora silenciosamente (sin toast, sin cambio de estado).
- Comillas simples, `;` al final de statements, imports nombrados desde `'react'` (no `import * as React`), consistente con el resto de `src/components/productos/`.

---

### Task 1: Función pura `extraerImagenDeClipboard`

**Files:**
- Create: `src/lib/extraerImagenDeClipboard.ts`
- Test: `src/lib/extraerImagenDeClipboard.test.ts`

**Interfaces:**
- Produces: `extraerImagenDeClipboard(items: ArrayLike<{ kind: string; type: string; getAsFile: () => File | null }>): File | null` — recorre los items y devuelve el primer `File` cuyo `type` empiece con `image/`, o `null` si no hay ninguno. Task 2 importa y llama a esta función con `e.clipboardData.items` (un `DataTransferItemList`, que estructuralmente satisface `ArrayLike<...>`).

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/extraerImagenDeClipboard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extraerImagenDeClipboard } from './extraerImagenDeClipboard';

describe('extraerImagenDeClipboard', () => {
  it('devuelve el File cuando hay un item de imagen', () => {
    const archivo = new File(['contenido'], 'foto.png', { type: 'image/png' });
    const items = [{ kind: 'file', type: 'image/png', getAsFile: () => archivo }];

    const resultado = extraerImagenDeClipboard(items);

    expect(resultado).toBe(archivo);
  });

  it('devuelve null cuando solo hay items de texto', () => {
    const items = [{ kind: 'string', type: 'text/plain', getAsFile: () => null }];

    const resultado = extraerImagenDeClipboard(items);

    expect(resultado).toBeNull();
  });

  it('devuelve null cuando la lista está vacía', () => {
    const resultado = extraerImagenDeClipboard([]);

    expect(resultado).toBeNull();
  });

  it('devuelve la imagen cuando hay varios items y solo uno es de imagen', () => {
    const archivo = new File(['contenido'], 'foto.jpg', { type: 'image/jpeg' });
    const items = [
      { kind: 'string', type: 'text/plain', getAsFile: () => null },
      { kind: 'file', type: 'image/jpeg', getAsFile: () => archivo },
      { kind: 'string', type: 'text/html', getAsFile: () => null },
    ];

    const resultado = extraerImagenDeClipboard(items);

    expect(resultado).toBe(archivo);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm run test -- extraerImagenDeClipboard`
Expected: FAIL — no se puede resolver el módulo `./extraerImagenDeClipboard` (el archivo todavía no existe).

- [ ] **Step 3: Implementación mínima**

Crear `src/lib/extraerImagenDeClipboard.ts`:

```ts
type ItemPortapapeles = {
  kind: string;
  type: string;
  getAsFile: () => File | null;
};

export function extraerImagenDeClipboard(items: ArrayLike<ItemPortapapeles>): File | null {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const archivo = item.getAsFile();
      if (archivo) return archivo;
    }
  }
  return null;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm run test -- extraerImagenDeClipboard`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/extraerImagenDeClipboard.ts src/lib/extraerImagenDeClipboard.test.ts
git commit -m "feat: agregar extraerImagenDeClipboard para detectar imágenes pegadas"
```

---

### Task 2: Componente `SelectorFotoProducto`

**Files:**
- Create: `src/components/productos/selector-foto-producto.tsx`

**Interfaces:**
- Consumes: `extraerImagenDeClipboard` de Task 1 (`import { extraerImagenDeClipboard } from '@/lib/extraerImagenDeClipboard';`).
- Consumes: `cn` de `@/lib/utils` (ya existe en el proyecto, usado por todos los componentes shadcn para clases condicionales).
- Produces: componente `SelectorFotoProducto` con props `{ archivo: File | null; onArchivoChange: (archivo: File | null) => void; disabled: boolean }`. Task 3 lo importa y lo renderiza dentro de `DialogoFotoProducto` en reemplazo del `<Input type="file">` inline.

Sin test automatizado (interacción real de DOM/clipboard/object URLs — ver Global Constraints). Se verifica manualmente en el Step 2.

- [ ] **Step 1: Crear el componente**

Crear `src/components/productos/selector-foto-producto.tsx`:

```tsx
'use client';

import { useEffect, useState, type ClipboardEvent } from 'react';
import { ClipboardPaste, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extraerImagenDeClipboard } from '@/lib/extraerImagenDeClipboard';
import { cn } from '@/lib/utils';

type SelectorFotoProductoProps = {
  archivo: File | null;
  onArchivoChange: (archivo: File | null) => void;
  disabled: boolean;
};

export function SelectorFotoProducto({ archivo, onArchivoChange, disabled }: SelectorFotoProductoProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!archivo) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(archivo);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  function manejarPaste(e: ClipboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const imagen = extraerImagenDeClipboard(e.clipboardData.items);
    if (imagen) onArchivoChange(imagen);
  }

  if (archivo && previewUrl) {
    return (
      <div className="space-y-2">
        {/* Preview de un archivo local (blob: URL) — next/image no aporta nada acá. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Preview de la foto del producto"
          className="max-h-48 w-full rounded-md border object-contain"
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => onArchivoChange(null)} disabled={disabled}>
          <X />
          Quitar foto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(e) => onArchivoChange(e.target.files?.[0] ?? null)}
      />
      <div
        tabIndex={disabled ? -1 : 0}
        aria-label="Pegar imagen: hacé clic y presioná Ctrl+V"
        onPaste={manejarPaste}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input py-6 text-center text-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <ClipboardPaste className="h-4 w-4" />
        <span>Pegá una imagen acá (Ctrl+V)</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificación manual en navegador**

Este componente no se usa todavía (Task 3 lo conecta), así que la verificación visual completa se hace al final de Task 3. Por ahora, correr `npx tsc --noEmit` para confirmar que el archivo compila sin errores de tipos.

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/productos/selector-foto-producto.tsx
git commit -m "feat: agregar SelectorFotoProducto con recuadro de pegado y preview"
```

---

### Task 3: Integrar `SelectorFotoProducto` en `DialogoFotoProducto`

**Files:**
- Modify: `src/components/productos/dialogo-foto-producto.tsx`

**Interfaces:**
- Consumes: `SelectorFotoProducto` de Task 2 (`import { SelectorFotoProducto } from '@/components/productos/selector-foto-producto';`).

Sin test automatizado (ver Global Constraints). Se verifica manualmente en el Step 3.

- [ ] **Step 1: Reemplazar el input inline por `SelectorFotoProducto`**

En `src/components/productos/dialogo-foto-producto.tsx`, reemplazar el import de `Input`:

```ts
import { Input } from '@/components/ui/input';
```

por:

```ts
import { SelectorFotoProducto } from '@/components/productos/selector-foto-producto';
```

Y reemplazar:

```tsx
        <Input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={isPending}
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
```

por:

```tsx
        <SelectorFotoProducto archivo={archivo} onArchivoChange={setArchivo} disabled={isPending} />
```

El resto del archivo (estado `archivo`/`open`/`isPending`, `analizar()`, `Dialog`/`DialogHeader`/`DialogFooter`, el botón "Analizar") no cambia.

- [ ] **Step 2: Verificar tipos y tests**

Run: `npx tsc --noEmit`
Expected: sin errores.

Run: `npm run test`
Expected: todos los tests existentes siguen en verde (este cambio no toca lógica testeada).

- [ ] **Step 3: Verificación manual en navegador**

Con `npm run dev` corriendo, ir a `/productos`, abrir "Nuevo producto desde foto":

1. Confirmar que se ve el input de archivo y, debajo, el recuadro punteado "Pegá una imagen acá (Ctrl+V)".
2. Copiar una imagen (captura de pantalla o "Copiar imagen" desde cualquier app/navegador), hacer clic en el recuadro y pegar con Ctrl+V — confirmar que aparece el preview y desaparecen el input/recuadro.
3. Hacer clic en "Quitar foto" — confirmar que vuelve a mostrarse el input + recuadro.
4. Elegir una foto por el input de archivo — confirmar que también muestra el preview.
5. Con una foto cargada, hacer clic en "Analizar" — confirmar que el flujo de extracción por IA sigue funcionando igual que antes.
6. Pegar texto copiado (no una imagen) en el recuadro — confirmar que no pasa nada (sin toast, sin cambios).

- [ ] **Step 4: Commit**

```bash
git add src/components/productos/dialogo-foto-producto.tsx
git commit -m "feat: usar SelectorFotoProducto en el diálogo de nuevo producto desde foto"
```
