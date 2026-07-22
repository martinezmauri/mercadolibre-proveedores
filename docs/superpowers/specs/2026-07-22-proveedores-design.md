# Diseño: Listado de Proveedores

## Contexto

Sistema propio para llevar la trazabilidad de la operación de MercadoLibre de Mauricio (proveedores, productos, totales, productos por proveedor). Se descarta Google Sheets/Smartsheet por límites de trial y ruido de interfaz; se construye una app propia con Next.js + Supabase.

Este documento cubre únicamente el primer sub-proyecto: el **listado de proveedores**. Productos, totales y la relación producto-proveedor son sub-proyectos futuros, cada uno con su propio spec, que se apoyan en esta misma app y en la tabla `categorias` definida acá.

## Usuarios y acceso

- Dos usuarios: Mauricio (desarrolla) y un compañero sin conocimientos de programación que necesita una UI completa para ver, agregar, editar y eliminar proveedores.
- Sin login: acceso solo por link privado. No hay autenticación ni roles.

## Arquitectura

Next.js (App Router) + Supabase, siguiendo el patrón página delgada → componente → hook → service → tipos:

```
app/
  proveedores/
    page.tsx                    ← thin, solo compone
components/
  proveedores/
    tabla-proveedores.tsx
    formulario-proveedor.tsx
    selector-categorias.tsx
hooks/
  use-proveedores.ts             ← estado del listado en el cliente
services/
  proveedores.ts                 ← crear, listar, actualizar, eliminar (server-side)
  categorias.ts                  ← listar categorías disponibles
types/
  proveedor.ts
```

Las funciones de `services/` se exponen como **Server Actions** de Next.js. La llave de Supabase capaz de escribir (secret key) vive solo del lado del servidor y nunca se expone al navegador — dado que no hay login, esto evita que cualquiera con el link pueda leer la llave desde las herramientas de desarrollador y escribir directo contra Supabase saltándose la app.

## Modelo de datos (Supabase / Postgres)

```
categorias
  id            uuid (pk)
  nombre        text unique          -- "hogar", "cocina", "electrónica", ...

proveedores
  id            uuid (pk)
  nombre        text not null
  url           text not null
  compra_minima numeric
  whatsapp      text
  created_at    timestamptz default now()

proveedor_categorias                 -- relación N:N
  proveedor_id  uuid (fk -> proveedores, on delete cascade)
  categoria_id  uuid (fk -> categorias, on delete cascade)
  primary key (proveedor_id, categoria_id)
```

`categorias` se siembra con los 12 valores iniciales: hogar, cocina, limpieza, electrónica, tecnología, belleza, cuidado personal, salud, bienestar, arte, manualidades, mascotas. Esta tabla es compartida: cuando se agregue el listado de productos, se reutiliza para categorizar productos también.

## Pantalla y flujo

Una sola página `/proveedores`:
- Tabla con todos los proveedores: nombre, URL (clickeable), compra mínima, WhatsApp (link directo a `wa.me/...`), chips de categorías.
- Botón para agregar un proveedor nuevo (modal con formulario).
- Edición y borrado por fila, mismo formulario modal.
- Validación con Zod antes de tocar la base: nombre y URL obligatorios, compra mínima ≥ 0.

## Manejo de errores

- Validación de formulario en el cliente (Zod + React Hook Form) antes de enviar.
- Errores de Supabase (fallo de red, constraint violado) se muestran como mensaje inline/toast; no hay fallos silenciosos.

## Testing

Tests sobre `services/proveedores.ts` (crear, listar, actualizar, eliminar, asignar categorías) simulando el cliente de Supabase, siguiendo la regla de TDD para features nuevas. No se cubre UI con tests automatizados en esta primera etapa.

## Fuera de alcance (sub-proyectos futuros)

- Listado de productos.
- Listado de totales (costos, ventas, márgenes — se define cuando se aborde ese sub-proyecto).
- Relación productos por proveedor.
- Autenticación / roles (si algún día se necesita proteger más allá del link privado).
