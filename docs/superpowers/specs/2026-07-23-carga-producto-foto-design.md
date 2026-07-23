# Diseño: Carga de producto desde foto (IA)

## Contexto

Tercer sub-proyecto de la hoja de ruta ("punto 3"), después de proveedores y productos. Fue investigado por separado en `docs/research/2026-07-23-extraccion-automatica-fotos-producto.md`, que recomendó como opción primaria un LLM con visión (Gemini 2.5 Flash o Claude Haiku 4.5) al que se le manda una foto y devuelve `{titulo, precio, categoria}` en JSON.

Esta funcionalidad agrega una forma alternativa de cargar un producto: sacarle una foto al cartel/etiqueta del catálogo de un proveedor, y que el sistema complete nombre, precio por mayor, categoría e imagen — en vez de tipearlo todo a mano. El flujo manual existente (`FormularioProducto`, botón "Nuevo producto") no cambia y sigue disponible siempre.

## Alcance

- Botón "Nuevo producto desde foto" junto al botón "Nuevo producto" existente en `/productos`.
- Diálogo dedicado (`DialogoFotoProducto`): selector de archivo de imagen (con `capture="environment"` para preferir la cámara trasera en celular) + botón "Analizar".
- Al analizar: la foto se sube a un bucket público de Supabase Storage (`productos`) y, en paralelo, se envía a **Claude Haiku 4.5** (API directa de Anthropic, sin OpenRouter) pidiendo `{nombre, precio, categoria}` como salida estructurada (JSON validado por esquema Zod). Se le pasa la lista de categorías existentes como opciones válidas para `categoria`, para que elija una de ellas o devuelva `null` si ninguna encaja — nunca inventa una categoría nueva.
- El precio detectado en la foto se asigna siempre a **precio por mayor** (lo que cobra el proveedor). Precio por menor no lo completa la IA — depende del margen del usuario, se carga a mano.
- Si la IA no está segura de un dato (nombre o precio ilegible, ninguna categoría razonable), lo devuelve como `null` en vez de inventarlo. Esos campos quedan vacíos en el formulario para completarlos a mano.
- Al terminar el análisis (con éxito o parcialmente vacío), se cierra el diálogo de foto y se abre el `FormularioProducto` **ya existente**, pre-cargado con nombre, precio por mayor, categoría (mapeada a su ID real) e imagen (URL pública del Storage). El usuario completa proveedor, precio por menor y URL del producto (ninguno de estos tres sale de la foto), revisa/corrige lo demás, y guarda con el flujo de creación que ya existe hoy — sin cambios en `crearProductoAction` ni en `productosService`.
- Validación de tamaño de archivo del lado del cliente: se rechaza (con mensaje claro) cualquier imagen mayor a 10 MB antes de subirla, para evitar solicitudes lentas o costosas por fotos innecesariamente pesadas.
- Manejo de error: si falla la subida a Storage o la llamada a la IA (sin crédito, sin conexión, error de la API), se muestra un mensaje de error dentro del diálogo y se puede reintentar o cerrar y usar "Nuevo producto" normal.

**Fuera de alcance:** escaneo de código de barras, OCR como fallback, edición del prompt o de la lista de categorías desde la UI, procesamiento por lote (una foto a la vez), historial o auditoría de los análisis realizados, redimensionado/compresión de imagen del lado del cliente (se sube tal cual, solo con el límite de tamaño de archivo).

## Arquitectura

### Modelo de datos

No hay cambios al esquema de `productos` ni a `categorias` — un producto cargado por foto es un producto normal, indistinguible en la base de datos de uno cargado a mano.

Se agrega un bucket de Supabase Storage:

```sql
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;
```

Público porque no hay sistema de login y las fotos de producto no son información sensible — una URL pública simplifica servir la imagen directamente como `imagen_url`, sin necesidad de URLs firmadas. Todas las operaciones de subida pasan igualmente por el cliente server-side con la clave secreta (mismo patrón que las tablas), así que no hacen falta políticas de RLS sobre `storage.objects` — la clave secreta las evita, igual que con las tablas de la base.

### Variables de entorno

Se agrega `ANTHROPIC_API_KEY` (server-only, nunca expuesta al navegador) al `.env.local` local del usuario — mismo tratamiento que `SUPABASE_SECRET_KEY` hoy: leída solo desde código de servidor, nunca importada en un componente cliente.

### Estructura de archivos

```
src/
  app/
    productos/
      actions.ts                        ← se agrega analizarFotoProductoAction
  components/
    productos/
      dialogo-foto-producto.tsx         ← nuevo: subir foto + botón Analizar
      formulario-producto.tsx           ← modificado: acepta valores iniciales pre-cargados
      tabla-productos.tsx / page.tsx    ← modificado: agrega el botón "Nuevo producto desde foto"
  lib/
    services/
      almacenamientoService.ts          ← nuevo: sube imagen a Supabase Storage
      extraccionProductoService.ts      ← nuevo: llama a Claude Haiku 4.5, mapea categoría
    validation/
      extraccionProductoSchema.ts       ← nuevo: esquema Zod de la respuesta de la IA
  types/
    producto.ts                          ← se agrega DatosExtraidosProducto
```

### Servicios nuevos

**`almacenamientoService.ts`:**
```typescript
subirImagenProducto(buffer: Buffer, mimeType: string): Promise<string>
```
Sube el archivo al bucket `productos` con un nombre generado (uuid + extensión derivada del `mimeType`) usando `createSupabaseServerClient().storage.from('productos').upload(...)`, y devuelve la URL pública (`getPublicUrl`). Sigue el mismo patrón de `throwOnSupabaseError` para el manejo de errores de Supabase que ya usan `proveedoresService`/`productosService`.

**`extraccionProductoService.ts`:**
```typescript
extraerDatosProducto(
  imageBase64: string,
  mimeType: string,
  categorias: Categoria[],
): Promise<DatosExtraidosProducto>
```
donde
```typescript
// src/types/producto.ts
type DatosExtraidosProducto = {
  nombre: string | null;
  precioMayor: number | null;
  categoriaId: string | null;
};
```

Internamente:
1. Construye el esquema Zod de la respuesta esperada del modelo (`extraccionProductoSchema.ts`):
   ```typescript
   export const extraccionProductoSchema = z.object({
     nombre: z.string().nullable(),
     precio: z.number().nullable(),
     categoria: z.string().nullable(),
   });
   ```
2. Llama a `client.messages.parse({ model: 'claude-haiku-4-5', ..., messages: [...imagen + prompt...], output_config: { format: zodOutputFormat(extraccionProductoSchema) } })`, usando `@anthropic-ai/sdk`. El prompt incluye la lista de nombres de `categorias` como opciones válidas y la instrucción explícita de devolver `null` en cualquier campo que no pueda leer con confianza (evita alucinaciones, siguiendo la recomendación del informe de investigación).
3. Mapea `respuesta.categoria` (nombre) contra la lista de `categorias` recibida (comparación case-insensitive) para obtener el `id` real; si no hay coincidencia o vino `null`, `categoriaId` queda `null`.
4. Devuelve `{ nombre: respuesta.nombre, precioMayor: respuesta.precio, categoriaId }`.

Errores de la API de Anthropic (sin crédito, rate limit, red) se dejan propagar como excepción; la Server Action los captura y los convierte en un mensaje de error legible para el usuario.

### Server Action

```typescript
// src/app/productos/actions.ts
type AnalisisFotoResult =
  | { success: true; data: DatosExtraidosProducto & { imagenUrl: string } }
  | { success: false; error: string };

export async function analizarFotoProductoAction(formData: FormData): Promise<AnalisisFotoResult>
```
No reutiliza `ActionResult` porque ese tipo no lleva payload de datos — este resultado necesita devolver los campos extraídos además de éxito/error. Internamente: lee el archivo de `formData`, valida tamaño (rechaza >10 MB con un error claro antes de llamar a cualquier servicio), lo sube vía `almacenamientoService.subirImagenProducto`, obtiene las categorías vía `categoriasService.listar()`, llama a `extraccionProductoService.extraerDatosProducto`, y devuelve ambos resultados combinados. Cualquier excepción de cualquiera de los dos pasos se captura y se traduce a un mensaje de error genérico ("No se pudo analizar la foto. Intentá de nuevo o cargá el producto manualmente.").

### Componentes

**`DialogoFotoProducto`:** diálogo controlado con estado propio (`useState` para el archivo elegido y el estado de carga). Input de tipo archivo + botón "Analizar" que llama a `analizarFotoProductoAction` con un `FormData`. Mientras está en curso, botón deshabilitado con indicador de carga (mismo patrón `useTransition`/`isPending` que `BotonEliminarProducto`). Si el resultado es error, se muestra con `toast` (vía `handleActionResult`-style, ya que sí hay un mensaje que mostrar aunque no sea exactamente un `ActionResult`). Si es éxito, el componente padre (`TablaProductos` o la página) recibe los datos extraídos, cierra este diálogo y abre `FormularioProducto` con esos valores.

**`FormularioProducto`:** se agrega una prop opcional `valoresIniciales?: Partial<ProductoFormInput>`. `buildDefaultValues` pasa a aceptar también este parámetro: si hay `producto` (modo edición), gana como hoy; si no, se mezclan `valoresIniciales` sobre los defaults vacíos actuales. No cambia el modo edición existente ni el submit — solo la fuente de los valores por defecto en modo creación.

**Botón "Nuevo producto desde foto":** agregado junto al botón "Nuevo producto" existente en la página o en `TablaProductos` (donde hoy vive el estado de los diálogos de detalle/edición), siguiendo el mismo patrón de estado-en-el-padre ya usado para coordinar diálogos hermanos (`proveedorSeleccionado`/`proveedorAEditar` en proveedores).

## Testing

Se testean `almacenamientoService` y `extraccionProductoService` con mocks (del cliente de Supabase Storage y del SDK de Anthropic respectivamente), siguiendo el mismo patrón TDD que el resto de los servicios del proyecto — casos de éxito, de error de la API externa, y de mapeo de categoría sin coincidencia. Sin tests de UI, consistente con el alcance ya acordado para este proyecto.

## Fuera de alcance (futuro)

- Escaneo de código de barras como atajo adicional (mencionado en la investigación como complemento opcional).
- OCR tradicional como fallback si se quiere evitar dependencia de un LLM.
- Redimensionado/compresión de imagen del lado del cliente antes de subir.
- Edición de categorías candidatas o del prompt desde la UI.
- Inventario propio (punto 4 — sigue pendiente, independiente de este sub-proyecto).
