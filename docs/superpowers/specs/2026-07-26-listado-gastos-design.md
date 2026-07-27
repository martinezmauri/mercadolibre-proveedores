# Diseño: Listado de Gastos

## Contexto

Nuevo sub-proyecto dentro de la app de gestión interna del emprendimiento de reventa en MercadoLibre (proveedores + productos ya construidos). El objetivo es llevar un registro de los gastos operativos del emprendimiento: qué se gastó, quién lo gastó, cuánto, y en qué categoría cae — para tener orden financiero básico, no para contabilidad formal.

No sigue el patrón de proveedores (relación N:N vía tabla puente + RPCs atómicas) ni necesita esa complejidad: es estructuralmente más parecido a productos (relación N:1 opcional a una tabla de categorías), pero con dos lookups sembrados en vez de uno, y con filtros — la primera pantalla del proyecto que los necesita.

## Alcance

- Tabla `gastos`, con relación obligatoria a `personas` (quién gastó) y relación opcional a `categorias_gasto`.
- `personas` y `categorias_gasto` son tablas sembradas por migración, **sin UI de administración en esta iteración** — agregar una persona o categoría nueva hoy es una migración chica. Está confirmado que en el futuro las categorías de gasto van a necesitar ser editables/dinámicas desde la UI; ese trabajo queda fuera de esta iteración pero el modelo de datos (en particular, que el color viva en la fila de `categorias_gasto` y no hardcodeado en el frontend) está pensado para no tener que rehacerse cuando eso se construya.
- CRUD completo de gastos: listar, crear, editar, eliminar. Misma UX que productos/proveedores (tabla, formulario en dialog, confirmación de borrado).
- Cada fila muestra persona y categoría como `Badge` coloreado (componente ya existente en el design system).
- Filtros arriba de la tabla, todos tipo selector (no búsqueda de texto libre):
  - Selector de persona (todas / una en particular)
  - Selector de categoría (todas / una en particular)
  - Selector de campo de fecha (creado / actualizado) + rango desde-hasta
- Campos del gasto: nombre, persona, categoría (opcional), monto (moneda: ARS).
- `created_at` y `updated_at` en cada fila, ambas visibles en la tabla y disponibles para el filtro de fecha.

Fuera de alcance (ver sección final para la lista completa): administración de personas/categorías desde la UI, vínculo de un gasto con un proveedor/producto puntual, búsqueda de texto libre por nombre, multi-moneda, filtrado server-side.

## Arquitectura

### Modelo de datos

```sql
personas
  id        uuid (pk)
  nombre    text not null unique

-- seed: 'Mauricio Martinez', 'Jeremias Aruta'

categorias_gasto
  id        uuid (pk)
  nombre    text not null unique
  color     text not null   -- token de paleta curada, no hex libre

-- seed (nombre → color):
--   'Insumos/stock'          → 'blue'
--   'Envíos'                 → 'cyan'
--   'Comisiones ML'          → 'amber'
--   'Publicidad'             → 'violet'
--   'Embalaje'               → 'orange'
--   'Herramientas/software'  → 'emerald'
--   'Otros'                  → 'slate'

gastos
  id             uuid (pk)
  nombre         text not null
  persona_id     uuid not null references personas(id)
  categoria_id   uuid references categorias_gasto(id) on delete set null
  monto          numeric not null check (monto > 0)
  created_at     timestamptz not null default now()
  updated_at     timestamptz not null default now()
```

`categoria_id` usa `on delete set null` (mismo criterio que `productos.categoria_id`): si algún día se borra una categoría, el gasto no desaparece, solo pierde la etiqueta. `persona_id` no tiene `on delete` explícito (default `restrict`) porque no hay forma de borrar una persona desde la UI en esta iteración — es una protección teórica, no una funcionalidad.

`updated_at` se setea explícitamente desde `gastosService.actualizar()` (`updated_at: new Date().toISOString()`) en vez de un trigger de Postgres — coherente con que el resto del código no usa triggers y todo el acceso pasa por un único punto de escritura (el service).

Las tres tablas nuevas llevan `enable row level security` sin policies, igual que `proveedores`/`productos`/`categorias`: el acceso real es siempre vía la service-role key del server, RLS acá es defensivo.

Los tokens de color (`'blue'`, `'cyan'`, etc.) se mapean a clases de Tailwind mediante un diccionario nuevo en el frontend (`src/lib/badgeColors.ts`), con variantes para light y dark mode. Para "quién gastó" no hay columna de color en base — como son 2 personas fijas sin plan de hacerse dinámicas, el color se asigna directamente en el componente que las renderiza (Mauricio Martinez → `indigo`, Jeremias Aruta → `fuchsia`, usando el mismo diccionario de tokens).

### Estructura de archivos

```
supabase/
  migrations/
    <timestamp>_gastos_schema.sql       ← las 3 tablas + seeds de personas y categorias_gasto

src/
  app/
    gastos/
      page.tsx                          ← Server Component: trae gastos + personas + categorias_gasto
      loading.tsx                       ← skeleton, mismo patrón que proveedores/productos
      actions.ts                        ← crear/actualizar/eliminar gasto
  components/
    gastos/
      formulario-gasto.tsx              ← dialog, RHF + Zod (nombre, persona, categoria, monto)
      columnas-gastos.tsx               ← nombre, persona (Badge), categoria (Badge), monto, created_at, updated_at, acciones
      tabla-gastos.tsx                  ← wrapper de DataTable
      boton-eliminar-gasto.tsx          ← AlertDialog de confirmación
      filtros-gastos.tsx                ← client component: selects de persona/categoría/campo-fecha + rango de fechas
    layout/
      app-sidebar.tsx                   ← se agrega el ítem "Gastos"
    ui/
      calendar.tsx, popover.tsx         ← se agregan vía `npx shadcn add calendar popover` (no están instalados)
  lib/
    badgeColors.ts                      ← diccionario token de color → clases Tailwind (light/dark)
    services/
      personasService.ts                ← solo listar()
      categoriasGastoService.ts         ← solo listar()
      gastosService.ts                  ← listar(filtros), crear(), actualizar(), eliminar()
    validation/
      gastoSchema.ts                    ← Zod: nombre, personaId, categoriaId (nullable), monto (positive)
  types/
    gasto.ts                            ← Gasto, GastoInput, Persona, CategoriaGasto, FiltrosGasto
```

`gastosService.listar(filtros)` arma el query encadenando `.eq('persona_id', ...)`, `.eq('categoria_id', ...)` y `.gte()/.lte()` sobre el campo de fecha elegido (`created_at` o `updated_at`), todos condicionales según qué filtros vengan seteados.

El filtrado es **en memoria, del lado del cliente**: `page.tsx` trae la lista completa de gastos (junto con personas y categorías) una sola vez; `filtros-gastos.tsx` filtra ese arreglo en el cliente a medida que el usuario cambia los selectores. No hay query params en la URL ni round-trip al server por cada cambio de filtro — es la opción más simple para el volumen de datos esperado en esta etapa. Si el volumen crece mucho, pasar a filtrado server-side vía `gastosService.listar(filtros)` (que ya queda preparado para aceptar filtros) es la migración natural.

## Testing

TDD igual que el resto del repo: `gastosService.test.ts` (mocks de Supabase vía `createQueryMock`, casos de éxito y error para listar/crear/actualizar/eliminar, incluyendo los distintos filtros), y `gastos/actions.test.ts` siguiendo el patrón de `proveedores/actions.test.ts`. Sin tests de UI ni de `filtros-gastos.tsx`, consistente con el alcance de testing ya acordado en este proyecto (los componentes de UI no se testean, los services y actions sí).

## Fuera de alcance (futuro)

- UI para crear/editar/eliminar personas o categorías de gasto (hoy: seed fijo vía migración). El modelo ya deja lugar para esto (color como dato en `categorias_gasto`).
- Vincular un gasto a un proveedor o producto puntual.
- Búsqueda de texto libre por nombre del gasto (los filtros son todos tipo selector).
- Soporte multi-moneda (por ahora todo es ARS).
- Filtrado server-side / paginación (hoy: se trae todo y se filtra en memoria).
