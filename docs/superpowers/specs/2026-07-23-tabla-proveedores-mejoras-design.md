# Diseño: Mejoras a la tabla de proveedores (modal de detalle + skeleton)

## Contexto

El listado de proveedores y el shell (sidebar, tipografía) ya están funcionando. El usuario planteó una hoja de ruta más amplia con cuatro piezas de madurez muy distinta:

1. **Mejoras a la tabla de proveedores** (este spec): modal de detalle al hacer clic en la fila, skeleton mientras carga.
2. Catálogo de productos por proveedor (próximo sub-proyecto, spec propio).
3. Extracción automática de datos de producto vía foto — tratado como investigación aparte, no como código (ver `docs/research/2026-07-23-extraccion-automatica-fotos-producto.md` una vez completada).
4. Inventario propio, distinto del catálogo del proveedor — sub-proyecto futuro, depende de que exista el punto 2.

Este documento cubre únicamente el punto 1. Es una mejora de UI sobre el listado de proveedores existente; no toca `src/lib/services/*`, Server Actions, ni el modelo de datos.

## Alcance

- Modal de detalle de solo lectura, se abre al hacer clic en cualquier parte de una fila de la tabla (excepto la columna "Acciones", que ya existe con editar/eliminar y no cambia).
- El modal de detalle muestra: nombre, URL, compra mínima, WhatsApp y categorías (chips), más botones "Cerrar" y "Editar". "Editar" cierra el modal de detalle y abre el formulario de edición ya existente (`FormularioProveedor`).
- Skeleton de tabla mientras la página `/proveedores` carga sus datos (convención `loading.tsx` de Next.js App Router), usando el componente `Skeleton` de shadcn ya instalado.

Fuera de alcance: cualquier dato de productos dentro del modal de detalle (no existen todavía — se agregarán cuando se construya el sub-proyecto de productos, punto 2). Cambios a la columna "Acciones" existente (editar/eliminar) más allá de frenar la propagación del click de fila.

## Arquitectura

**Modal de detalle:** nuevo componente `src/components/proveedores/detalle-proveedor-dialog.tsx`, un `Dialog` de shadcn controlado (open/onOpenChange) que recibe el `Proveedor` a mostrar. Expone su propio estado de apertura vía props (a diferencia de `FormularioProveedor`, que maneja su estado de apertura internamente), porque necesita ser abierto programáticamente desde el click de fila en vez de desde un trigger propio.

**Click en fila → abrir modal:** se agrega una prop opcional `onRowClick?: (row: TData) => void` al `DataTable` genérico (`src/components/ui/data-table.tsx`), aplicada como `onClick` en cada `<TableRow>`. `TablaProveedores` la usa para guardar el proveedor clickeado en estado local y controlar la apertura de `DetalleProveedorDialog`. La celda de "Acciones" (`columnas-proveedores.tsx`) llama a `event.stopPropagation()` en su contenedor para que los clicks en Editar/Eliminar no disparen también el modal de detalle.

**Skeleton:** `src/app/proveedores/loading.tsx` (archivo especial de Next.js App Router — se muestra automáticamente vía Suspense mientras el Server Component de la página resuelve su `Promise.all` de datos). Contiene una versión esqueleto de la tabla: una barra para el título/botón y unas pocas filas de `Skeleton` imitando las columnas reales (nombre, URL, compra mínima, WhatsApp, categorías, acciones).

## Testing

Sin tests automatizados nuevos — consistente con el alcance de testing ya acordado para este proyecto (solo se testea `src/lib/services/*`). Verificación manual: clic en una fila abre el modal con los datos correctos; clic en Editar/Eliminar dentro de la fila NO abre el modal de detalle; "Editar" dentro del modal de detalle cierra ese modal y abre el formulario de edición con los datos correctos; recargar `/proveedores` con conexión lenta (throttle en devtools) muestra el skeleton antes de la tabla real.

## Fuera de alcance (futuro)

- Mostrar productos del proveedor dentro del modal de detalle (cuando exista el sub-proyecto de productos).
- Cualquier cambio a `proveedoresService`, Server Actions, o el modelo de datos.
