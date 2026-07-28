# Diseño: Modelo de datos flexible para Proveedores

## Contexto

El usuario tiene un listado de +1000 proveedores mayoristas (Argentina, mayormente reventa/importación) en un PDF (`docs/+1000_PROVEEDORES.pdf`, 36 páginas) que quiere cargar en la base para poder consultarlos desde `/proveedores`. El PDF está organizado en ~35 "rubros" comerciales (Bazar y Juguetería, Ferretería, Tecnología, Perfumes, Jeans, Kiosco y Almacén, etc.) y cada ficha tiene una cantidad muy variable de datos de contacto: 0 a 3+ teléfonos, sitio web opcional, email opcional, redes sociales opcionales (Instagram/Facebook/TikTok), 0 a 4+ direcciones de sucursal, y a veces texto suelto (horario, opciones de servicio, descripciones).

El esquema actual de `proveedores` es demasiado rígido para esto: una sola `url` (obligatoria), un solo `whatsapp`, sin email, sin dirección, sin redes sociales. Este spec cubre **solo el modelo de datos y la UI para soportarlo** — el proceso de extraer las +1000 fichas del PDF hacia este modelo es un proyecto aparte, con su propio spec y plan, que depende de que este quede cerrado primero.

## Alcance

- Nuevo modelo de datos flexible para proveedores: contactos de cantidad variable (teléfonos, whatsapp, email, redes sociales, direcciones) y notas libres.
- El "rubro" comercial del PDF se modela reutilizando la tabla `categorias` ya existente (compartida hoy con productos y gastos) — no se crea una tabla nueva para esto. Las ~35 filas de rubros se agregan a esa misma tabla; los valores actuales (hogar, cocina, limpieza, etc.) fueron solo semilla inicial y pueden editarse o eliminarse sin restricción.
- Migración de los proveedores ya cargados a mano: sus valores de `whatsapp` se copian a la nueva tabla de contactos antes de eliminar esa columna, para no perder datos existentes.
- Ajustes de UI en `/proveedores` (formulario, detalle, tabla) para mostrar y editar los nuevos campos.
- Paginación y búsqueda del lado del servidor para el listado, dado que va a pasar de unas pocas decenas de filas a +1000.

Explícitamente **fuera de alcance**:
- El pipeline de importación del PDF en sí (parseo de las +1000 fichas, deduplicación de proveedores que aparecen en más de un rubro, descarte de fichas sin datos usables) — es un spec y plan separado, posterior a este.
- El selector de proveedor dentro del formulario de "Nuevo producto" en `/productos` (hoy un `<Select>` simple sin búsqueda) — con +1000 proveedores se vuelve poco práctico, pero es un problema de UX de `/productos` que se resuelve en otro momento, no en este spec.

## Arquitectura

### Esquema de base de datos

**`categorias`** — sin cambios de estructura. La carga de las ~35 filas de rubros del PDF es parte del pipeline de importación (fuera de este spec), no de esta migración.

**`proveedores`** — cambios:
- `url` pasa de `NOT NULL` a nullable.
- Se agrega `notas text` nullable — texto libre para horario, opciones de servicio, descripciones sueltas, y cualquier dato residual que no entre en un campo estructurado.
- Se elimina la columna `whatsapp`. Antes de eliminarla, una migración copia los valores existentes (`where whatsapp is not null`) hacia `proveedor_contactos` con `tipo = 'whatsapp'`.
- `compra_minima` sin cambios.

**`proveedor_contactos`** (tabla nueva):

```sql
create table public.proveedor_contactos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  tipo text not null,
  valor text not null
);

alter table public.proveedor_contactos enable row level security;
```

- Un proveedor puede tener 0 a N filas de cualquier `tipo`: `telefono`, `whatsapp`, `email`, `instagram`, `facebook`, `tiktok`, `direccion`. Esta lista de tipos válidos vive en el código (validación Zod), no como constraint de base — así se pueden sumar tipos nuevos sin migración.
- Las direcciones de sucursales múltiples se modelan como varias filas `tipo = 'direccion'` en esta misma tabla, sin tabla propia.

### Tipos y servicios (TypeScript)

`src/types/proveedor.ts`:

```ts
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

`proveedoresService.ts`:
- El select de `listar()`/`obtenerPorId()` suma el join a `proveedor_contactos`.
- `crear_proveedor`/`actualizar_proveedor` (RPCs) se extienden para recibir los contactos (mismo patrón que ya usan para `categoria_ids`: un array, en este caso de objetos `{tipo, valor}` en vez de uuids), reemplazando todos los contactos del proveedor en cada actualización (igual que hoy se hace con las categorías).
- Se agrega un método nuevo `buscar({ pagina, tamañoPagina, busqueda, categoriaId })` que arma la consulta con `.ilike('nombre', ...)`, filtro opcional por categoría vía `proveedor_categorias`, y `.range()` + `count: 'exact'` para la paginación. El `listar()` existente (sin filtros, trae todo) se mantiene intacto para los otros consumidores actuales: el selector de proveedor en el formulario de `/productos` y el conteo de Inicio.

### UI

- **Formulario de proveedor**: se agrega una sección "Contactos" con filas dinámicas (selector de tipo + input de valor, botón agregar/quitar fila), y un campo de texto libre para "Notas".
- **Detalle del proveedor**: el bloque fijo de URL/Compra mínima/WhatsApp se reemplaza por: URL (si existe, si no "—"), la lista de contactos agrupados por tipo (con ícono Lucide distinto según tipo), y Notas (si existe).
- **Tabla y filtros de `/proveedores`**: la tabla hoy no tiene barra de búsqueda ni paginación (trae y renderiza todas las filas). Se agrega una barra de búsqueda por nombre + selector de rubro/categoría, siguiendo el mismo patrón visual que ya usa Gastos, más un paginador. Los filtros y la página actual viven en los query params de la URL: la navegación (cambiar de página, tipear una búsqueda, elegir un rubro) actualiza la URL y el Server Component de `/proveedores/page.tsx` vuelve a pedir los datos con `buscar(...)`. Los detalles exactos de cómo esta versión de Next.js maneja `searchParams` en un Server Component se confirman leyendo `node_modules/next/dist/docs/` al momento de implementar (por la advertencia de `AGENTS.md` sobre cambios respecto a versiones previas de Next.js).

## Testing

- TDD para la lógica pura/testeable: mapeo de filas de `proveedor_contactos` a `Contacto[]` en el servicio, y la construcción de la query de `buscar()` (verificar que arma los filtros de búsqueda/categoría/paginación correctamente — puede testearse con un mock de Supabase como ya hacen `proveedoresService.test.ts` y otros servicios existentes).
- Sin test automatizado para los componentes de UI nuevos (formulario de contactos, detalle, barra de filtros) — mismo criterio que el resto del proyecto (no hay tests de componentes React, `vitest.config.ts` usa `environment: 'node'`). Verificación manual en navegador.
- Migración de `whatsapp` existente: verificar manualmente (o con un test de servicio) que después de aplicar la migración, cada proveedor que tenía `whatsapp is not null` antes tiene ahora una fila correspondiente en `proveedor_contactos`.

## Fuera de alcance (futuro)

- Pipeline de importación del PDF (spec y plan separados, posteriores a este).
- Selector de proveedor con búsqueda en el formulario de `/productos`.
- Constraint de base de datos para validar los valores de `tipo` en `proveedor_contactos` (por ahora se valida solo en la capa de aplicación).
