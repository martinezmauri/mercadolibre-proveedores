# Design System — Proveedores App

> Este documento es la **referencia visual obligatoria** para toda la interfaz del proyecto.
> Cualquier vista nueva, componente o modificación de UI debe seguir estas reglas sin excepción.
> Inspirado en el estilo visual de Lightdash, adaptado a nuestro proyecto.

---

## 1. Tipografía

### Fuente principal: **Inter**

- Importar desde Google Fonts via `next/font/google`
- Variable CSS: `--font-inter`
- Subsets: `latin`
- Weights cargados: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold)

### Fuente monoespaciada: **Geist Mono**

- Usar solo para código, IDs técnicos, o datos numéricos tabulares
- Variable CSS: `--font-geist-mono`

### Escala tipográfica

| Elemento                | Tamaño   | Peso     | Color               |
| ----------------------- | -------- | -------- | -------------------- |
| Título de página (h1)   | 24px     | SemiBold (600) | `foreground`    |
| Subtítulo de página     | 14px     | Regular (400)  | `muted-foreground` |
| Título de sección (h2)  | 18px     | SemiBold (600) | `foreground`    |
| Título de card (h3)     | 16px     | Medium (500)   | `foreground`    |
| Body / Texto general    | 14px     | Regular (400)  | `foreground`    |
| Texto secundario        | 14px     | Regular (400)  | `muted-foreground` |
| Label de formulario     | 14px     | Medium (500)   | `foreground`    |
| Caption / Texto pequeño | 12-13px  | Regular (400)  | `muted-foreground` |
| KPI valor grande         | 28-32px  | Bold (700)     | `foreground`    |
| KPI label               | 12-13px  | Regular (400)  | `muted-foreground` |
| Tabla header            | 13px     | Medium (500)   | `muted-foreground` |
| Tabla body              | 14px     | Regular (400)  | `foreground`    |
| Badge / Tag             | 12px     | Medium (500)   | (ver sección Badges) |

### Reglas tipográficas

- **Nunca** usar `font-bold` (700) para texto corriente; reservarlo solo para KPI values.
- Los títulos de página usan `font-semibold` (600), no bold.
- El interlineado (line-height) debe ser cómodo: `1.5` para body, `1.3` para headings.
- Usar `antialiased` en el html para renderizado suave.

---

## 2. Paleta de Colores

### Principio general

- El color de **acento primario** es **Rosa/Pink** (`oklch(0.65 0.25 350)`).
- La interfaz es mayormente **neutra** (grises y blancos), usando el rosa como punto focal en acciones principales, links activos, gráficos primarios y elementos interactivos.
- En dark mode, los colores se ajustan para mantener contraste y legibilidad.

### Variables CSS — Light Mode

```css
:root {
  /* Backgrounds */
  --background: oklch(0.985 0 0);          /* Gris casi blanco, fondo general */
  --foreground: oklch(0.145 0 0);          /* Negro suave, texto principal */

  /* Cards y Popovers */
  --card: oklch(1 0 0);                    /* Blanco puro */
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* Primary — Rosa/Pink */
  --primary: oklch(0.65 0.25 350);         /* Rosa vibrante */
  --primary-foreground: oklch(1 0 0);      /* Blanco sobre rosa */

  /* Secondary — Gris neutro claro */
  --secondary: oklch(0.96 0 0);
  --secondary-foreground: oklch(0.205 0 0);

  /* Muted — Para textos secundarios y fondos sutiles */
  --muted: oklch(0.96 0 0);
  --muted-foreground: oklch(0.50 0 0);

  /* Accent — Para hovers y estados activos sutiles */
  --accent: oklch(0.96 0 0);
  --accent-foreground: oklch(0.205 0 0);

  /* Destructive — Rojo para acciones peligrosas */
  --destructive: oklch(0.577 0.245 27.325);

  /* Bordes e Inputs */
  --border: oklch(0.90 0 0);              /* Borde sutil pero visible */
  --input: oklch(0.90 0 0);
  --ring: oklch(0.65 0.25 350);           /* Ring = primary (rosa) */

  /* Charts — Paleta para gráficos */
  --chart-1: oklch(0.65 0.25 350);        /* Rosa (primario) */
  --chart-2: oklch(0.70 0.18 55);         /* Naranja cálido */
  --chart-3: oklch(0.72 0.15 185);        /* Teal */
  --chart-4: oklch(0.68 0.20 300);        /* Violeta */
  --chart-5: oklch(0.78 0.15 85);         /* Amarillo suave */

  /* Sidebar — Claro/Blanco */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.40 0 0);
  --sidebar-primary: oklch(0.65 0.25 350);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.95 0.02 350);    /* Rosa muy sutil para hover */
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.92 0 0);
  --sidebar-ring: oklch(0.65 0.25 350);

  --radius: 0.5rem;
}
```

### Variables CSS — Dark Mode

```css
.dark {
  --background: oklch(0.13 0 0);
  --foreground: oklch(0.93 0 0);

  --card: oklch(0.18 0 0);
  --card-foreground: oklch(0.93 0 0);
  --popover: oklch(0.18 0 0);
  --popover-foreground: oklch(0.93 0 0);

  --primary: oklch(0.72 0.22 350);         /* Rosa un poco más claro en dark */
  --primary-foreground: oklch(0.13 0 0);

  --secondary: oklch(0.22 0 0);
  --secondary-foreground: oklch(0.93 0 0);

  --muted: oklch(0.22 0 0);
  --muted-foreground: oklch(0.63 0 0);

  --accent: oklch(0.22 0 0);
  --accent-foreground: oklch(0.93 0 0);

  --destructive: oklch(0.704 0.191 22.216);

  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.72 0.22 350);

  --chart-1: oklch(0.72 0.22 350);
  --chart-2: oklch(0.75 0.16 55);
  --chart-3: oklch(0.75 0.13 185);
  --chart-4: oklch(0.72 0.18 300);
  --chart-5: oklch(0.80 0.13 85);

  --sidebar: oklch(0.16 0 0);
  --sidebar-foreground: oklch(0.80 0 0);
  --sidebar-primary: oklch(0.72 0.22 350);
  --sidebar-primary-foreground: oklch(0.13 0 0);
  --sidebar-accent: oklch(0.22 0.02 350);
  --sidebar-accent-foreground: oklch(0.93 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.72 0.22 350);
}
```

---

## 3. Badges / Tags de Estado

Los badges usan colores suaves de fondo con texto en versión oscura del mismo tono. Siempre con bordes redondeados (`rounded-full` o `rounded-md`).

| Categoría       | Background          | Texto              | Ejemplo de uso        |
| --------------- | ------------------- | ------------------- | --------------------- |
| **Verificado**  | Verde claro `oklch(0.92 0.08 145)` | Verde oscuro `oklch(0.40 0.12 145)` | Estado confirmado |
| **Ventas**      | Naranja claro `oklch(0.92 0.08 65)` | Naranja oscuro `oklch(0.45 0.14 65)` | Categoría ventas |
| **Finanzas**    | Azul claro `oklch(0.92 0.06 250)` | Azul oscuro `oklch(0.40 0.12 250)` | Categoría finanzas |
| **Operaciones** | Rosa claro `oklch(0.92 0.06 350)` | Rosa oscuro `oklch(0.45 0.14 350)` | Categoría operaciones |
| **Marketing**   | Amarillo claro `oklch(0.94 0.08 90)` | Amarillo oscuro `oklch(0.45 0.12 90)` | Categoría marketing |
| **Beta/Riesgo** | Rojo claro `oklch(0.92 0.08 25)` | Rojo oscuro `oklch(0.45 0.16 25)` | Estado beta/pendiente |

### Implementación de badges

```tsx
// Usar el componente Badge de shadcn con variant personalizado
// O crear classes utilitarias:
<Badge className="bg-green-50 text-green-700 border-green-200">Verificado</Badge>
<Badge className="bg-orange-50 text-orange-700 border-orange-200">Ventas</Badge>
```

En dark mode, usar versiones más saturadas con fondo más oscuro:
```tsx
// Dark mode automático via Tailwind
<Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
  Verificado
</Badge>
```

---

## 4. Layout y Espaciado

### Estructura general

```
┌─────────────────────────────────────────┐
│  Sidebar (claro)  │   Content Area      │
│  ───────────────  │                     │
│  Logo/Nombre      │  ┌─ Page Header ──┐ │
│                   │  │ Título   [Acción]│ │
│  Nav items        │  │ Subtítulo       │ │
│  · Inicio         │  └─────────────────┘ │
│  · Proveedores    │                     │
│  · Productos      │  ┌─ Filtros ──────┐ │
│                   │  │ 🔍 [chip][chip] │ │
│                   │  └─────────────────┘ │
│                   │                     │
│                   │  ┌─ Tabla ─────────┐ │
│                   │  │ Header row      │ │
│                   │  │ Data rows...    │ │
│                   │  └─────────────────┘ │
└─────────────────────────────────────────┘
```

### Espaciado

| Zona                    | Valor          |
| ----------------------- | -------------- |
| Padding del content area | `p-6` (24px)  |
| Gap entre secciones     | `space-y-6` (24px) |
| Gap entre header y filtros | `space-y-4` (16px) |
| Gap entre filtros y tabla | `space-y-4` (16px) |
| Padding interno de cards | `p-6` (24px)  |
| Gap entre cards en grid | `gap-4` o `gap-6` |
| Padding de filas de tabla | `py-4 px-4`  |

### Page Header (patrón obligatorio)

Toda página debe tener un header con este formato:

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">Título de Página</h1>
    <p className="text-sm text-muted-foreground mt-1">
      Descripción breve de qué se gestiona acá
    </p>
  </div>
  <div className="flex items-center gap-2">
    {/* Botones de acción: Nuevo, Exportar, etc. */}
  </div>
</div>
```

---

## 5. Tablas

### Estilo visual

- **Sin bordes verticales** — solo líneas horizontales sutiles (`border-b`) separando filas.
- **Sin fondo alterno** en filas (no zebra striping).
- **Hover sutil** en filas: fondo gris muy claro al pasar el mouse.
- **Header**: texto en `muted-foreground`, peso `medium`, tamaño `13px`, sin fondo especial.
- **Padding generoso** en cada celda: `py-4 px-4`.

### Barra de filtros (arriba de la tabla)

Colocar una barra de filtros entre el header y la tabla:

```tsx
<div className="flex items-center gap-3">
  {/* Search input */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Buscar por nombre..."
      className="pl-9 w-[250px]"
    />
  </div>

  {/* Filter chips / selects */}
  <Select>...</Select>
  <Select>...</Select>

  {/* Counter a la derecha */}
  <div className="ml-auto text-sm text-muted-foreground">
    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1.5" />
    {total} registros
  </div>
</div>
```

### Contenedor de tabla

Las tablas van dentro de un contenedor con borde y border-radius:

```tsx
<div className="rounded-lg border bg-card">
  <Table>...</Table>
</div>
```

---

## 6. Formularios y Modales

### Inputs

- Border radius: `rounded-md` (var `--radius`)
- Borde: `border` (usa `--border`)
- Focus: ring en color `--primary` (rosa)
- Placeholder: color `muted-foreground`
- Altura: `h-10` (40px)
- Padding horizontal: `px-3`

### Labels

- Peso: `medium` (500)
- Tamaño: 14px
- Color: `foreground`
- Margen inferior: `mb-2`

### Modales / Dialogs

- Fondo overlay: negro con 50% opacidad
- Card del modal: `bg-card`, `rounded-lg`, `shadow-lg`
- Padding: `p-6`
- Header del modal: título + descripción + separador
- Footer con acciones: alineado a la derecha con `gap-2`

### Botones

| Variante     | Uso                                  | Estilo                              |
| ------------ | ------------------------------------ | ----------------------------------- |
| `default`    | Acción principal (Guardar, Crear)    | Fondo `primary` (rosa), texto blanco |
| `outline`    | Acción secundaria (Cancelar, Filtrar)| Borde, fondo transparente           |
| `ghost`      | Acciones sutiles (iconos, menús)     | Sin borde ni fondo, hover sutil     |
| `destructive`| Eliminar                             | Fondo rojo                          |

---

## 7. Cards y KPIs

### Cards de contenido

```tsx
<div className="rounded-lg border bg-card p-6">
  <h3 className="text-base font-medium mb-4">Título del card</h3>
  {/* contenido */}
</div>
```

### Cards de KPI / Métricas

```tsx
<div className="rounded-lg border bg-card p-6">
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
    Nombre de la métrica
  </p>
  <p className="text-3xl font-bold mt-2">8,099</p>
  <p className="text-xs text-muted-foreground mt-1">
    <span className="text-green-600">↑ 12%</span> vs mes anterior
  </p>
</div>
```

Layout de KPIs: usar grid responsive:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* KPI cards */}
</div>
```

---

## 8. Gráficos y Dashboards

### Contenedor de gráfico

Siempre dentro de un card con título:

```tsx
<div className="rounded-lg border bg-card p-6">
  <h3 className="text-sm font-medium mb-4">¿Cuál es el revenue semanal?</h3>
  {/* Chart component */}
</div>
```

### Paleta de colores para gráficos

Usar las variables `--chart-1` a `--chart-5` en este orden de prioridad:
1. **Rosa** (chart-1) — para la métrica principal
2. **Naranja** (chart-2) — para comparación
3. **Teal** (chart-3) — para tercera serie
4. **Violeta** (chart-4) — para cuarta serie
5. **Amarillo** (chart-5) — para quinta serie

### Layout de dashboard

Usar grid con columnas adaptables:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Chart cards */}
</div>
```

Secciones del dashboard separadas con títulos con emoji:
```tsx
<div className="space-y-6">
  <h2 className="text-lg font-semibold">📊 Ventas y Marketing</h2>
  {/* Grid de charts */}
</div>
```

---

## 9. Sidebar

### Estilo: Claro/Blanco

- Background: `--sidebar` (blanco/gris muy claro)
- Borde derecho sutil: `border-r`
- Items de navegación con icono (Lucide) + texto
- Item activo: fondo rosa sutil (`sidebar-accent` con tinte rosa), texto más oscuro
- Item hover: fondo gris muy claro

### Iconografía del sidebar

Usar iconos de **Lucide React** para cada ítem de navegación. Tamaño consistente: `h-4 w-4` o `h-5 w-5`.

---

## 10. Iconografía General

### Librería: Lucide React

- Ya está instalada (`lucide-react`)
- Tamaño estándar en UI: `h-4 w-4`
- Tamaño en botones con solo icono: `h-4 w-4`
- Color: heredar del texto (`currentColor`)

### Uso de emojis

- Permitido como identificador visual en listas de métricas, secciones de dashboard, y categorías.
- Usar emojis que representen el concepto (ej: 📊 para ventas, 🎯 para soporte, 📦 para productos).
- **No** usar emojis en botones de acción ni en labels de formulario.

---

## 11. Estados y Feedback

### Loading

- Usar `Skeleton` de shadcn para estados de carga
- Las tablas muestran filas skeleton con el mismo padding y altura
- Los KPI cards muestran un skeleton del número

### Empty state

Cuando una tabla no tiene datos:
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <PackageSearch className="h-10 w-10 text-muted-foreground mb-3" />
  <p className="text-sm font-medium">No se encontraron resultados</p>
  <p className="text-xs text-muted-foreground mt-1">
    Intentá con otros filtros o creá un nuevo registro
  </p>
</div>
```

### Toasts / Notificaciones

- Usar `Sonner` (ya instalado)
- Posición: bottom-right
- Estilo: seguir el theme actual (light/dark)

---

## 12. Responsive

- **Sidebar**: colapsable en mobile (ya implementado con shadcn sidebar)
- **Tablas**: scroll horizontal en pantallas chicas
- **Grid de KPIs**: 1 columna en mobile, 2 en tablet, 3-4 en desktop
- **Grid de gráficos**: 1 columna en mobile, 2 en desktop
- **Formularios**: campos ocupan ancho completo en mobile, 2 columnas en desktop

---

## 13. Reglas Generales (DO / DON'T)

### ✅ DO

- Usar las CSS variables definidas en este sistema para todos los colores
- Mantener consistencia en spacing (múltiplos de 4px: 4, 8, 12, 16, 24, 32)
- Usar los componentes shadcn/ui existentes, no reinventar
- Agregar `tracking-tight` a títulos principales
- Usar `rounded-lg` para containers y cards, `rounded-md` para inputs y botones
- Toda tabla debe tener barra de búsqueda/filtros arriba
- Todo page header debe tener título + subtítulo descriptivo

### ❌ DON'T

- No usar colores hardcodeados — siempre via variables CSS o clases de Tailwind semánticas
- No usar bordes verticales en tablas
- No usar zebra striping (filas con fondo alterno)
- No usar `font-bold` para texto que no sea un KPI value
- No usar sombras fuertes (`shadow-xl`, `shadow-2xl`) — máximo `shadow-sm` o `shadow`
- No crear componentes de UI desde cero si existe el equivalente en shadcn
- No usar tamaños de texto mayores a `text-3xl` excepto en KPIs hero
- No dejar páginas sin subtítulo descriptivo debajo del h1
