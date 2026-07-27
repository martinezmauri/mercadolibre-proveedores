# Diseño: Rebrand de Design System

## Contexto

`docs/DESIGN_SYSTEM.md` se agregó como referencia visual obligatoria para toda la app, pero hoy no está aplicado: la app sigue con Poppins, paleta neutra, sidebar sin identidad propia, header vacío, y sin dark mode funcional. Esto se acordó explícitamente como una tarea aparte durante la feature de "listado de gastos" (que sí siguió el patrón nuevo en sus propios archivos, sin tocar el resto). Esta es esa tarea: aplicar el sistema de diseño a toda la app — cáscara (tema, sidebar, header) y las tres vistas existentes (proveedores, productos, gastos) — de una sola vez, para que todo lo que se construya de acá en adelante nazca alineado.

## Alcance

- **Tema global**: fuente Inter (reemplaza Poppins), paleta de colores light/dark exacta de `DESIGN_SYSTEM.md` aplicada a `globals.css`, y dark mode realmente funcional (hoy `next-themes` está instalado pero sin `ThemeProvider`, así que no hace nada).
- **Sidebar**: bloque de marca (ícono + nombre "Gestión de Proveedores") arriba de la navegación; se quita el label "Navegación".
- **Header**: pasa de tener solo el trigger del sidebar a incluir un indicador de la sección actual + un toggle de tema claro/oscuro (botón de 2 estados, sin selector de "sistema").
- **Colores de categoría en Proveedores/Productos**: se agrega una columna `color` a la tabla `categorias` (igual patrón que `categorias_gasto` — nunca se muestra como texto/columna en la UI, solo estiliza el badge) y sus tablas pasan de badges grises a badges coloreados, igual que Gastos.
- **Retrofit de Proveedores y Productos**: header de página (`text-2xl` + subtítulo) y contenedor de tabla (`rounded-lg border bg-card`) para que sigan el mismo patrón que Gastos. Gastos no se toca — ya cumple el sistema.
- **Página de Inicio** (`/`, hoy `return null`): pasa a ser un dashboard simple con 3 KPI cards (total proveedores, total productos, monto total de gastos).

Fuera de alcance: selector de tema de 3 estados (claro/oscuro/sistema) — solo 2 estados. Gráficos o filtros en la página de Inicio. Cambiar el nombre interno del paquete (`package.json`) — solo el `<title>` del navegador y el bloque de marca del sidebar. Rediseñar formularios/modales más allá de heredar las variables de color nuevas (no hay cambios de layout en `Dialog`/`AlertDialog`).

## Arquitectura

### Tema y dark mode

`src/app/layout.tsx`: se reemplaza el import de `Poppins` por `Inter` (mismos pesos 400/500/600/700), y se envuelve el contenido con `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` de `next-themes`. El `<html>` necesita `suppressHydrationWarning` (patrón estándar de `next-themes` para evitar el warning de mismatch entre el render del servidor y el `.dark` class que el script de `next-themes` aplica en el cliente antes de la hidratación).

`src/app/globals.css`: se reemplazan los valores de `:root` y `.dark` por los de `DESIGN_SYSTEM.md` sección 2 (rosa/pink como `--primary`, `--radius: 0.5rem`, paleta `--chart-1` a `--chart-5`, variables de `--sidebar-*`). La estructura (`@theme inline`, `@custom-variant dark`) no cambia, solo los valores.

`ThemeToggle` (nuevo componente, `src/components/layout/theme-toggle.tsx`): botón que llama a `useTheme()` de `next-themes` y alterna entre `'light'` y `'dark'` (ignora `'system'` una vez que el usuario lo tocó — es decir, el estado inicial puede ser "system" pero el botón siempre alterna a un valor explícito). Ícono sol/luna de Lucide según el tema resuelto.

### Sidebar

`src/components/layout/app-sidebar.tsx`: se agrega un `SidebarHeader` (slot ya provisto por el componente `Sidebar` de shadcn) con un cuadrado de acento (`bg-sidebar-primary`, ícono Lucide) + el texto "Gestión de Proveedores". Se quita el `<SidebarGroupLabel>Navegación</SidebarGroupLabel>`. `NAV_ITEMS` no cambia de estructura, pero se exporta (o se duplica mínimamente) para que el header pueda derivar la sección actual del mismo mapeo `href → label`.

### Header

`src/app/layout.tsx` reemplaza:
```tsx
<div className="p-2"><SidebarTrigger /></div>
```
por un nuevo componente `src/components/layout/app-header.tsx` (client component): `SidebarTrigger` + texto de la sección actual (busca `usePathname()` contra el mapeo de `NAV_ITEMS`) a la izquierda, `ThemeToggle` a la derecha. Barra con `border-b`, altura consistente con el resto del layout (`h-14`, `px-4`).

### Colores de categoría

Migración: `alter table public.categorias add column color text not null default 'slate'` (con un `update` inmediato asignando el token real a cada una de las 12 filas ya sembradas, y luego se puede quitar el `default` o dejarlo como fallback defensivo — se deja el `default` para no romper un insert futuro que no lo especifique).

Asignación (mismo set de 9 tokens que ya usa Gastos — algunos se repiten, son 12 categorías para 9 colores):

| Categoría | Color |
|---|---|
| hogar | amber |
| cocina | orange |
| limpieza | cyan |
| electrónica | blue |
| tecnología | indigo |
| belleza | fuchsia |
| cuidado personal | violet |
| salud | emerald |
| bienestar | slate |
| arte | fuchsia |
| manualidades | violet |
| mascotas | orange |

Refactor: `ColorToken` se mueve de `src/types/gasto.ts` a `src/lib/badgeColors.ts` (su dueño natural — no tiene sentido que un tipo de color compartido viva en el archivo de tipos de un feature específico). `types/gasto.ts` y `types/proveedor.ts` (que gana `color: ColorToken` en su tipo `Categoria`) lo importan desde ahí. `categoriasService.listar()` pasa a seleccionar `'id, nombre, color'` en vez de `'id, nombre'`.

`columnas-proveedores.tsx` y `columnas-productos.tsx`: el `<Badge variant="secondary">{nombre}</Badge>` actual pasa a `<Badge variant="outline" className={cn(badgeColorClasses(categoria.color))}>{nombre}</Badge>`, igual patrón que `columnas-gastos.tsx`.

### Retrofit de páginas

`src/app/proveedores/page.tsx` y `src/app/productos/page.tsx`: el `<h1 className="text-4xl font-semibold">` sin subtítulo pasa al patrón de `src/app/gastos/page.tsx` (`text-2xl font-semibold tracking-tight` + `<p className="text-sm text-muted-foreground mt-1">`). Subtítulos: "Gestioná los proveedores mayoristas del catálogo." / "Gestioná el catálogo de productos y sus precios.". Sus `TablaProveedores`/`TablaProductos` pasan `className="rounded-lg border bg-card"` al `DataTable` subyacente (la prop ya existe desde la feature de Gastos, no hace falta tocar `data-table.tsx`).

### Página de Inicio

`src/app/page.tsx`: Server Component que trae `proveedoresService.listar()`, `productosService.listar()`, `gastosService.listar()` en paralelo, y renderiza 3 `KpiCard` (nuevo componente chico, `src/components/inicio/kpi-card.tsx`, patrón exacto de `DESIGN_SYSTEM.md` sección 7: label uppercase `text-xs`, valor `text-3xl font-bold`) en un grid: "Proveedores" (`.length`), "Productos" (`.length`), "Gastos" (suma de `monto` formateada en ARS, mismo `Intl.NumberFormat` que ya usa `columnas-gastos.tsx`).

## Testing

Sin tests de UI (mismo criterio que el resto del proyecto — sidebar/header/página de inicio/retrofit no se testean). La migración de `categorias` se verifica igual que las anteriores (aplicar vía Supabase MCP + `execute_sql` para confirmar las 12 filas con su color). El resto se verifica con `npm run build` (type-check) y un smoke test manual en navegador (dark mode, toggle, sidebar, header, las 4 páginas).

## Fuera de alcance (futuro)

- Selector de tema de 3 estados (claro/oscuro/sistema).
- Gráficos, filtros o más KPIs en la página de Inicio.
- UI para administrar categorías (colores asignados por migración, sin UI — mismo criterio que `personas`/`categorias_gasto`).
- Rediseño de formularios/modales más allá de heredar la paleta nueva.
