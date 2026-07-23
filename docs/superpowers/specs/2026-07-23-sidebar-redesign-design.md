# Diseño: Rediseño de shell (sidebar) y estilo Shopify-like

## Contexto

El listado de proveedores (primer sub-proyecto) ya está funcionando: CRUD completo, revisado y corregido. Ahora se rediseña el "shell" de la app (navegación + layout general) y el look & feel, inspirado en la estructura de Shopify (no su paleta de colores): sidebar de navegación persistente, tipografía distinta, vista de proveedores a ancho completo.

Este spec cubre únicamente el shell (sidebar, layout raíz, tipografía) y ajustes de estilo a la vista de proveedores existente. No agrega funcionalidad nueva de negocio.

## Alcance

- Sidebar de navegación con dos ítems: "Inicio" (`/`) y "Proveedores" (`/proveedores`).
- Página "Inicio" (`/`) vacía — sin contenido, solo existe como destino de navegación.
- Layout raíz reestructurado para envolver la app en el `Sidebar` de shadcn.
- Cambio de tipografía: de Geist a Poppins (Google Fonts).
- Ajustes de estilo en la vista `/proveedores`: título más grande y alineado a la izquierda, tabla a ancho completo, botón "Nuevo proveedor" a la derecha (ya lo está).
- Paleta de colores: sin cambios — shadcn ya está inicializado con `baseColor: "neutral"` (blanco/negro/gris), que es lo que se pidió.

Fuera de alcance: más ítems de navegación, contenido real en "Inicio", cualquier funcionalidad de negocio nueva.

## Arquitectura

Se agrega el componente `Sidebar` oficial de shadcn/ui (`npx shadcn add sidebar`), que trae `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarMenu`/`SidebarMenuItem`/`SidebarMenuButton`, `SidebarInset`, etc. El proyecto ya tiene los tokens de color `--sidebar-*` definidos en `globals.css` desde la inicialización de shadcn (Task 2 del sub-proyecto anterior), así que el componente integra sin fricción de theming.

`src/app/layout.tsx` pasa de renderizar `{children}` directo a:

```
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>{children}</SidebarInset>
</SidebarProvider>
```

`AppSidebar` (nuevo componente, `src/components/layout/app-sidebar.tsx`) es un client component que usa `usePathname()` para resaltar el ítem de navegación activo entre "Inicio" y "Proveedores".

`src/app/page.tsx` deja de redirigir a `/proveedores` (comportamiento agregado en el code review anterior, ahora obsoleto) y pasa a ser una página vacía real — corresponde ahora que existe una navegación explícita hacia "Inicio".

## Tipografía

Se reemplaza Geist/Geist Mono por Poppins vía `next/font/google` en `layout.tsx`. Se corrige además un problema preexistente en `globals.css`: la variable `--font-sans` del bloque `@theme inline` apuntaba a sí misma (`--font-sans: var(--font-sans)`), una referencia circular que en los hechos significaba que Geist nunca se aplicaba realmente al body (el navegador caía al font stack por defecto de Tailwind). Se corrige para que `--font-sans` apunte a `--font-poppins`.

## Vista de proveedores

Cambios puramente de estilo sobre `src/app/proveedores/page.tsx`, sin tocar lógica:
- Se remueve la clase `mx-auto max-w-5xl` del contenedor `<main>` — al no estar centrado con ancho máximo, el contenido (título, tabla) ocupa el ancho completo del área de contenido (que `SidebarInset` ya recorta automáticamente para dejar lugar al sidebar) y el título queda alineado a la izquierda del área de contenido en vez de centrado en la pantalla completa.
- El título "Proveedores" pasa de `text-2xl` a `text-4xl`.
- El botón "Nuevo proveedor" ya está a la derecha (contenedor flex `justify-between`) — sin cambios.

## Testing

Sin tests automatizados nuevos (es un cambio de estilo/estructura visual, consistente con el alcance de testing ya acordado para este proyecto: solo se testea `src/lib/services/*`). Se verifica manualmente en el navegador: navegación entre "Inicio"/"Proveedores", resaltado del ítem activo, tabla a ancho completo, build de producción sin errores.

## Fuera de alcance (futuro)

- Más ítems de sidebar a medida que se agreguen sub-proyectos (productos, totales, etc.).
- Contenido real en la página "Inicio".
- Modo oscuro / toggle de tema (los tokens de color ya soportan `dark:`, pero no se expone ningún control todavía).
