# Diseño: Listado de Productos

## Contexto

Segundo sub-proyecto de la hoja de ruta (después del listado de proveedores): un catálogo de productos, donde cada producto pertenece a un proveedor específico. Es el "punto 2" de la conversación sobre próximos pasos — el "punto 4" (inventario propio, distinto del catálogo del proveedor) queda para después, una vez que este exista. El "punto 3" (extracción automática de datos vía foto) fue investigado por separado (`docs/research/2026-07-23-extraccion-automatica-fotos-producto.md`) y no se implementa todavía — el campo de imagen se agrega ahora como URL de texto simple, para completarlo manualmente o (más adelante) mediante esa investigación.

Sigue exactamente el mismo patrón arquitectónico que proveedores: página con tabla (DataTable + modal de detalle + skeleton), Server Actions delgadas, servicio con la lógica de Supabase, validación con Zod.

## Alcance

- Tabla `productos` en Supabase, con relación obligatoria a un proveedor (`proveedor_id`) y relación opcional a una categoría (`categoria_id`, reutilizando la tabla `categorias` ya existente).
- CRUD completo: listar, crear, editar, eliminar — misma UX que proveedores (tabla, modal de detalle al hacer clic en la fila, columna Acciones con editar/eliminar, skeleton mientras carga).
- Formulario de producto con selector de proveedor (dropdown simple por nombre) y selector de categoría (dropdown simple, una sola categoría — a diferencia de proveedores que permite varias).
- Campos: nombre, URL del producto, imagen (URL de texto), precio por menor, precio por mayor.
- Ítem "Productos" agregado al sidebar, apuntando a `/productos`.
- Refactor menor: mover el tipo `ActionResult` de `src/app/proveedores/actions.ts` a `src/lib/actionResult.ts` (junto a `handleActionResult`, que ya vive ahí) para que productos lo reutilice sin importar del feature de proveedores.

Fuera de alcance: carga real de imágenes (archivo/upload) — por ahora es un campo de texto para pegar una URL. Extracción automática de datos vía IA (punto 3, investigación separada). Inventario propio (punto 4, sub-proyecto futuro). Combobox con búsqueda para el selector de proveedor (alcanza un `Select` simple mientras la lista de proveedores sea chica).

## Arquitectura

**Modelo de datos:**
```sql
productos
  id              uuid (pk)
  proveedor_id    uuid not null references proveedores(id) on delete cascade
  categoria_id    uuid references categorias(id) on delete set null
  nombre          text not null
  url             text not null
  imagen_url      text
  precio_menor    numeric
  precio_mayor    numeric
  created_at      timestamptz not null default now()
```

`proveedor_id` usa `on delete cascade` (si se borra un proveedor, sus productos se borran con él — consistente con cómo `proveedor_categorias` ya se comporta). `categoria_id` usa `on delete set null` (si se borra una categoría, el producto no debería desaparecer, solo perder la categoría asignada).

A diferencia de proveedores (relación N:N con categorías vía tabla intermedia), acá la relación producto→categoría es N:1 directa (una columna `categoria_id`), así que no hace falta tabla de unión ni las funciones RPC atómicas que se construyeron para proveedores — `productosService.crear`/`actualizar` son un insert/update de una sola fila cada uno, atómico por naturaleza en Postgres sin necesidad de una función envolvente.

**Estructura de archivos** (calca el patrón de proveedores):
```
src/
  app/
    productos/
      page.tsx            ← Server Component, lista productos + proveedores + categorias
      loading.tsx          ← skeleton, mismo patrón que proveedores
      actions.ts            ← Server Actions: crear/actualizar/eliminar producto
  components/
    productos/
      formulario-producto.tsx      ← incluye selector de proveedor y de categoría
      columnas-productos.tsx
      tabla-productos.tsx
      detalle-producto-dialog.tsx
    layout/
      app-sidebar.tsx        ← se agrega el ítem "Productos"
  lib/
    services/
      productosService.ts
    validation/
      productoSchema.ts
    actionResult.ts          ← se le agrega el tipo ActionResult (movido desde proveedores/actions.ts)
  types/
    producto.ts
```

`proveedores/actions.ts` pasa a importar `ActionResult` desde `@/lib/actionResult` en vez de declararlo localmente — sin cambio de comportamiento, solo de ubicación.

## Testing

Se testea `productosService.ts` siguiendo el mismo patrón TDD que `proveedoresService.ts` (mocks de Supabase vía `createQueryMock`, casos de éxito y error para cada operación). Sin tests de UI, consistente con el alcance ya acordado para este proyecto.

## Fuera de alcance (futuro)

- Carga de imagen por archivo (hoy es una URL de texto).
- Extracción automática de datos vía foto (punto 3 — investigación ya hecha, implementación pendiente de decisión).
- Inventario propio (punto 4 — depende de que este sub-proyecto exista primero).
- Combobox con búsqueda para el selector de proveedor, si la lista crece mucho.
