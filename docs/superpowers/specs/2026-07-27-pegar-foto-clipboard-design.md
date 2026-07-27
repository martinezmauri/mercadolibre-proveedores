# Diseño: Pegar foto desde el portapapeles en "Nuevo producto desde foto"

## Contexto

El diálogo `DialogoFotoProducto` (`/productos`, botón "Nuevo producto desde foto") hoy solo permite cargar la imagen con un `<Input type="file">`. El usuario quiere poder copiar una imagen (por ejemplo desde otra app o el portapapeles del sistema) y pegarla directamente en un recuadro dentro del diálogo, sin tener que guardarla como archivo primero.

## Alcance

- El recuadro de pegado **convive** con el input de archivo existente — no lo reemplaza. Cualquiera de los dos métodos carga la misma foto.
- Una vez que hay una imagen cargada (por cualquiera de los dos métodos), se muestra un **preview** (miniatura) en vez del input/recuadro, con un botón para quitarla y volver a elegir/pegar.
- Si el usuario pega algo que no es una imagen (texto, etc.), se **ignora silenciosamente** — sin toast ni cambio de estado.
- Fuera de alcance: drag-and-drop de archivos, múltiples imágenes, edición/recorte de la imagen pegada, cambios a la lógica de extracción por IA o a la server action (`analizarFotoProductoAction`) — ambas ya reciben un `File` dentro de un `FormData`, y un archivo pegado del portapapeles es también un `File`, así que viaja por el mismo camino sin cambios.

## Arquitectura

### 1. `src/lib/extraerImagenDeClipboard.ts` (nuevo — función pura)

```ts
export function extraerImagenDeClipboard(items: ArrayLike<{ kind: string; type: string; getAsFile: () => File | null }>): File | null
```

(La implementación final usa `ArrayLike<...>` en vez de `DataTransferItemList` directamente — permite testear con objetos planos sin DOM real, sin perder compatibilidad: `DataTransferItemList` satisface esa forma estructuralmente.)

Recorre los items del portapapeles y devuelve el primer `File` cuyo `type` empiece con `image/` (vía `item.getAsFile()`), o `null` si no hay ninguno. Sin dependencias de React ni del DOM más allá del tipo `DataTransferItemList` — testeable con objetos mock planos (`{ kind, type, getAsFile }`).

### 2. `src/components/productos/selector-foto-producto.tsx` (nuevo — presentacional)

```ts
type SelectorFotoProductoProps = {
  archivo: File | null;
  onArchivoChange: (archivo: File | null) => void;
  disabled: boolean;
};
```

- Si `archivo` es `null`: renderiza el `<Input type="file" accept="image/*" capture="environment">` (igual que hoy) y, debajo, un recuadro nuevo:
  - `<div tabIndex={0} aria-label="Pegar imagen: hacé clic y presioná Ctrl+V" onPaste={...}>` con borde punteado (`border-2 border-dashed rounded-lg`), ícono Lucide `ClipboardPaste` y texto `"Pegá una imagen acá (Ctrl+V)"` en `text-sm text-muted-foreground`, centrado, con `focus-visible:ring-2 focus-visible:ring-ring` para accesibilidad de teclado.
  - El handler `onPaste` llama a `extraerImagenDeClipboard(e.clipboardData.items)`; si devuelve un `File`, llama a `onArchivoChange(file)`. Si devuelve `null`, no hace nada (ignorado silenciosamente).
- Si `archivo` no es `null`: renderiza un preview con `<img src={previewUrl} className="max-h-48 w-full rounded-md border object-contain" />` y un botón "Quitar foto" (`variant="ghost"`, ícono `X`) que llama a `onArchivoChange(null)`.
- El `previewUrl` se genera con `URL.createObjectURL(archivo)` dentro de un `useEffect` que depende de `archivo`, y se libera con `URL.revokeObjectURL` en el cleanup (tanto al cambiar de archivo como al desmontar), para no filtrar memoria.
- El input y el recuadro respetan `disabled` (deshabilitados mientras `isPending`).

### 3. `src/components/productos/dialogo-foto-producto.tsx` (modificado)

Reemplaza el `<Input type="file">` inline por:

```tsx
<SelectorFotoProducto archivo={archivo} onArchivoChange={setArchivo} disabled={isPending} />
```

El resto del componente (estado `archivo`, `analizar()`, `DialogContent`, `DialogFooter`, el botón "Analizar") no cambia.

## Testing

- **TDD completo** para `extraerImagenDeClipboard` (función pura, sin DOM real):
  - Hay un item con `type: 'image/png'` → devuelve el `File` de `getAsFile()`.
  - Solo hay items `type: 'text/plain'` → devuelve `null`.
  - Lista vacía → devuelve `null`.
  - Hay varios items (texto + imagen) → devuelve el `File` de la imagen, ignorando los demás.
- **Sin test automatizado** para `SelectorFotoProducto` ni el cambio en `DialogoFotoProducto`: son interacción real de DOM/clipboard/object URLs. Mismo criterio que el resto del proyecto — no hay tests de componentes React en el repo, solo de lógica pura (services, actions, validación, `filtrarGastos`). Verificación manual en navegador: pegar una imagen copiada y ver el preview, quitar la foto y volver a elegir por input, y confirmar que "Analizar" sigue funcionando igual que antes.

## Fuera de alcance (futuro)

- Drag-and-drop de archivos.
- Soporte para pegar/cargar más de una imagen a la vez.
- Recorte o edición de la imagen antes de analizar.
