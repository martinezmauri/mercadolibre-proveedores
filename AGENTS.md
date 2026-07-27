<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-system-rules -->
# Design System — OBLIGATORIO

**Toda modificación de UI debe seguir las reglas de `docs/DESIGN_SYSTEM.md`.**
Leé ese archivo ANTES de crear o modificar cualquier componente, página o vista.

## Resumen rápido (ver docs/DESIGN_SYSTEM.md para detalles):

- **Fuente**: Inter (no Poppins, no system fonts)
- **Color primario**: Rosa/Pink — `oklch(0.65 0.25 350)`
- **Sidebar**: Claro/blanco (no oscuro)
- **Tablas**: Sin bordes verticales, solo separadores horizontales sutiles, hover sutil, barra de filtros arriba
- **Page headers**: Siempre título (h1, text-2xl, semibold) + subtítulo descriptivo (text-sm, muted-foreground)
- **Badges**: Colores suaves de fondo con texto oscuro del mismo tono
- **Cards**: `rounded-lg border bg-card p-6`
- **KPI values**: `text-3xl font-bold`, label en `text-xs text-muted-foreground uppercase`
- **Iconos**: Lucide React, tamaño `h-4 w-4`
- **NO usar**: colores hardcodeados, bordes verticales en tablas, sombras fuertes, font-bold en texto normal
- **Soporta**: Light + Dark mode
<!-- END:design-system-rules -->
