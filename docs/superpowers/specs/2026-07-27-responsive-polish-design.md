# Diseño: Pasada de Responsividad

## Contexto

La app (Inicio, Proveedores, Productos, Gastos, más el shell sidebar/header) fue construida sin una revisión explícita de mobile. Una auditoría rápida mostró que la base de shadcn/ui ya cubre la mayoría de los casos difíciles (drawer de sidebar en mobile, scroll horizontal en tablas, dialogs con ancho responsive, footers de dialog que apilan botones) — lo que falta es un conjunto acotado de ajustes puntuales en headers de página, un botón específico, padding de contenido, y la barra de filtros de Gastos.

## Alcance

- **Headers de página** (las 4 vistas): el título pasa a apilarse arriba de los botones de acción en pantallas angostas, en vez de compartir una sola fila que puede desbordar.
- **Botón "Nuevo producto desde foto"** (`/productos`): se colapsa a un ícono en mobile para convivir con el botón "Nuevo producto" sin desbordar.
- **Padding de contenido**: se reduce en mobile en las 4 páginas (`p-4` en vez de `p-6`), volviendo a `p-6` desde el breakpoint `sm`.
- **Barra de filtros de Gastos**: los controles (selects + date-range picker) pasan a ocupar el ancho completo apilados en columna en mobile, en vez de mantener anchos fijos que quedan chicos o desalineados.

Explícitamente fuera de alcance (ya funcionan, no se tocan): el comportamiento del sidebar en mobile (ya usa un `Sheet`/drawer), el scroll horizontal de las tablas (ya funciona, no se ocultan columnas), los dialogs y los 3 formularios existentes (ya son responsive por defecto vía shadcn), y el grid de KPIs de Inicio (ya tiene breakpoints).

## Arquitectura

Todos los cambios son clases de Tailwind condicionadas por el breakpoint `sm:` (640px) — sin nuevos componentes, sin JavaScript adicional, sin nuevas dependencias. El breakpoint único mantiene el criterio ya usado en el grid de KPIs de Inicio (`grid-cols-1 sm:grid-cols-2`).

**Headers de página** — patrón a aplicar en `src/app/page.tsx`, `src/app/proveedores/page.tsx`, `src/app/productos/page.tsx`, `src/app/gastos/page.tsx`: el contenedor del header pasa de `flex items-center justify-between` a `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`.

**Botón "Nuevo producto desde foto"** (`src/components/productos/nuevo-producto-desde-foto.tsx`): el texto del botón se envuelve en `<span className="hidden sm:inline">`, se agrega un ícono `Camera` de Lucide siempre visible, y un `aria-label="Nuevo producto desde foto"` fijo en el `Button` para que el botón siga siendo accesible cuando el texto está oculto.

**Padding de contenido**: en cada `<main>` de las 4 páginas, `className="space-y-6 p-6"` pasa a `className="space-y-6 p-4 sm:p-6"`.

**Barra de filtros de Gastos** (`src/components/gastos/filtros-gastos.tsx` y `src/components/gastos/listado-gastos.tsx`):
- Cada `SelectTrigger` pasa de un ancho fijo (`w-44`/`w-48`) a `w-full sm:w-44` (o `sm:w-48` según el control).
- El botón del date-range picker pasa de `w-64` a `w-full sm:w-64`.
- El contenedor de `FiltrosGastos` pasa de `flex flex-wrap items-center gap-2` a `flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center`.
- El wrapper en `listado-gastos.tsx` que hoy pone `FiltrosGastos` y el contador de registros en una sola fila (`flex items-center gap-3`) pasa a `flex flex-col gap-3 sm:flex-row sm:items-center`, y el contador pierde su `ml-auto` fijo (pasa a `sm:ml-auto`) para no quedar pegado de forma rara cuando los filtros están apilados en columna.

## Testing

Sin tests automatizados (cambios de layout/CSS puro, mismo criterio que el resto del proyecto). Verificación manual en navegador simulando varios anchos de viewport (mobile ~375px, tablet ~768px, desktop) en las 4 vistas: headers, botón de foto, padding, y filtros de Gastos.

## Fuera de alcance (futuro)

- Ocultar columnas de tabla en mobile (se decidió depender solo del scroll horizontal).
- Navegación mobile alternativa al drawer actual del sidebar (ya funciona, no se toca).
- Rediseño de los formularios o dialogs existentes.
