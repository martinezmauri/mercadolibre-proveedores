# Extracción automática de datos desde una foto de producto

**Fecha:** 2026-07-23
**Contexto:** Herramienta interna (Next.js + Supabase) para una operación de reventa en MercadoLibre de 2 personas. Volumen bajo (un puñado de fotos por día), presupuesto limitado. Objetivo (a futuro, no a implementar ahora): sacar una foto a un producto en el catálogo/depósito de un proveedor, subirla, y que el sistema devuelva **título, precio y categoría** en vez de tipearlo a mano.

> Este documento es **investigación**, no implementación. No se tocó código de la aplicación.

---

## Resumen ejecutivo (para leer primero)

- Para este caso (volumen bajo, equipo chico, "que funcione y sea simple" por sobre "perfecto"), la mejor opción es un **LLM con visión** al que se le manda la foto y devuelve un JSON con `{titulo, precio, categoria}`. Es lo único que en **una sola llamada** lee el texto del cartel/etiqueta **y además** infiere la categoría, incluso sin que haya una etiqueta de categoría en la foto.
- El costo a este volumen (50–200 fotos/mes) es **prácticamente cero** en cualquiera de los tres proveedores (OpenAI, Google Gemini, Anthropic Claude): centavos por mes. El presupuesto no es el factor decisivo; lo son la precisión con fotos "de la vida real" y la simplicidad de integración.
- **OCR tradicional solo** (Tesseract, Google Cloud Vision OCR, AWS Textract) alcanza para leer texto impreso y limpio, pero **no infiere categoría** y falla con etiquetas estilizadas o precios escritos a mano. Sirve como complemento o alternativa barata, no como solución completa.
- **Código de barras / QR** es gratis y muy preciso, pero solo funciona **si el producto tiene un código visible** y **si tenés una base de datos** para traducir ese código a título/precio/categoría. Útil como "atajo" opcional, no como base.

**Recomendación (detalle al final):**
- **Primaria:** LLM con visión + salida estructurada (JSON). Concretamente **Gemini 2.5 Flash** (o **Claude Haiku 4.5**) por costo/simplicidad.
- **Alternativa (fallback):** **Google Cloud Vision OCR** + reglas simples (regex de precio) + un mapeo palabra→categoría. Más barato aún y sin "alucinaciones", pero pierde la inferencia de categoría y sufre con etiquetas raras.
- **Costo estimado a 50–200 fotos/mes:** entre **US$0 y ~US$0,50 por mes** en la opción primaria; **US$0** (dentro del free tier) en la alternativa.

---

## 1. LLMs con visión (GPT / Gemini / Claude)

Los tres proveedores grandes ofrecen modelos multimodales que aceptan una imagen + un prompt y devuelven texto (o JSON estructurado). Para este caso todos son capaces de:

- **Leer un cartel/etiqueta de precio impreso** desde una foto de teléfono, incluso con perspectiva, algo de desenfoque o iluminación despareja. Los modelos actuales tienen visión de alta resolución (Claude Opus/Sonnet y GPT hasta ~2576 px en el lado largo), lo que ayuda con carteles pequeños dentro de una foto grande.
- **Inferir una categoría razonable** a partir del aspecto del producto **aunque no haya etiqueta de categoría**: "esto es un par de auriculares inalámbricos → Electrónica/Audio". Esto es lo que un OCR puro **no** puede hacer.
- **Devolver JSON garantizado** mediante *structured outputs* (esquema JSON): Claude (`output_config.format`), OpenAI (JSON Schema / structured outputs) y Gemini (`responseSchema`). Esto elimina el parseo frágil de texto libre.

### Integración desde Next.js / Node
En los tres casos es una **llamada simple** desde el backend (route handler o server action de Next.js), no requiere infraestructura propia:
- **OpenAI:** SDK oficial `openai` (Node) o REST.
- **Google Gemini:** SDK `@google/genai` o REST.
- **Anthropic Claude:** SDK `@anthropic-ai/sdk` o REST.

Patrón: se sube la foto a Supabase Storage (o se manda en base64), el backend la envía al modelo con un prompt tipo *"Extraé título, precio y categoría de MercadoLibre de este producto y devolvé JSON con este esquema"*, y se guarda el resultado. La clave de API vive en el servidor (nunca en el cliente).

### Costo por imagen (aprox.)
El cobro es **por tokens**, no por imagen fija. Una imagen equivale a una cantidad de tokens según el modelo, más un prompt corto (~200 tokens) y una salida chica (~150 tokens de JSON). Estimación por foto:

| Modelo | Precio input / output (por 1M tokens) | Tokens ~img | Costo aprox. por foto |
|---|---|---|---|
| **Gemini 2.5 Flash-Lite** | $0,10 / $0,40 | ~260–560 | **~US$0,0001–0,0002** |
| **Gemini 2.5 Flash** | $0,30 / $2,50 | ~260–560 | ~US$0,0005–0,001 |
| **GPT-5 nano / mini** | $0,05 / — · $0,125 / — | ~765 | ~US$0,0002–0,001 |
| **GPT-4o-mini** | $0,15 / $0,60 | ~765+ | ~US$0,0005–0,002 |
| **GPT-4o** | $2,50 / $10 | ~765 | ~US$0,002–0,004 |
| **Claude Haiku 4.5** | $1 / $5 | ~1.300 (≈1.380/MP) | **~US$0,002–0,003** |
| **Claude Sonnet 5** | $3 / $15 (intro $2/$10 hasta 2026-08-31) | ~2.000+ (alta-res) | ~US$0,006–0,010 |
| **Claude Opus 4.8** | $5 / $25 | ~2.000+ | ~US$0,01–0,02 |

> Los modelos "grandes" (GPT-4o, Sonnet, Opus) tienen mejor razonamiento visual pero para leer un cartel e inferir categoría **no hacen falta**: los modelos "flash/mini/haiku" alcanzan de sobra y cuestan una fracción.

**A 50–200 fotos/mes**, incluso con Claude Haiku (el más caro de la fila barata) hablamos de **US$0,10–US$0,60 por mes**. Con Gemini Flash-Lite es **efectivamente gratis** (además tiene free tier). El costo **no es un problema** en ninguno.

### Precisión esperada con fotos "de góndola/catálogo" (no estudio)
- **Título/nombre:** muy buena. Los LLM de visión leen texto impreso incluso con ruido, y además "entienden" qué parte de la foto es el nombre del producto vs. otro texto.
- **Precio:** buena, con una salvedad importante: si hay **varios precios** en la foto (precio de lista vs. oferta, varios productos en una góndola), el modelo puede elegir mal. Se mitiga con un prompt claro ("el precio del producto principal / el más destacado") y validando el formato (`$`, separadores de miles). Precios **manuscritos o muy estilizados** los lee mejor que un OCR clásico, pero no es infalible.
- **Categoría:** buena para categorías generales ("Electrónica", "Indumentaria", "Hogar"). Para el árbol de categorías **específico de MercadoLibre** conviene dar la lista de categorías candidatas en el prompt (o mapear la categoría general que devuelve el modelo contra las categorías de ML) en vez de pedirle que la adivine exacta.

**Riesgo principal:** *alucinación*. El modelo puede "inventar" un precio o título plausible cuando la foto es ilegible, en vez de decir "no lo veo". Se mitiga pidiéndole explícitamente que devuelva `null` cuando un dato no está claro, y mostrando el resultado al usuario para confirmar antes de guardar (que es justo lo que se quiere: revisar en vez de tipear).

---

## 2. OCR tradicional + reglas

Dos sabores: **self-hosted** (Tesseract) y **OCR en la nube** (Google Cloud Vision OCR, AWS Textract).

### Tesseract (self-hosted, gratis)
- **Costo:** software libre; pagás solo el cómputo donde corra. En serverless (Vercel/Supabase Edge) es incómodo por el tamaño del binario y los tiempos.
- **Precisión con fotos reales:** floja. Tesseract funciona bien con documentos escaneados, limpios y bien alineados; con fotos de teléfono (perspectiva, fondo, iluminación, tipografías de marketing) baja mucho y suele requerir preprocesado de imagen (recorte, umbralizado) para dar algo usable.
- **Handwriting / estilizado:** prácticamente no. No lee manuscrito y sufre con tipografías de cartel.
- **Categoría:** **imposible.** Tesseract solo transcribe texto; no razona sobre qué es el producto.

### Google Cloud Vision OCR / AWS Textract (nube)
- **Precisión:** mucho mejor que Tesseract con fotos reales (están entrenados para imágenes "en la naturaleza", no solo escaneos). Leen texto impreso torcido/con ruido con buena tasa de acierto. Textract también extrae texto impreso bien; ambos siguen siendo **débiles con manuscrito estilizado** comparado con un LLM de visión.
- **Costo:**
  - **Google Cloud Vision** `TEXT_DETECTION` / `DOCUMENT_TEXT_DETECTION`: **primeras 1.000 imágenes/mes gratis**, luego **US$1,50 por 1.000**. A 50–200/mes: **US$0 (gratis)**.
  - **AWS Textract** `DetectDocumentText`: **US$1,50 por 1.000 páginas** (US$0,0015/página); free tier de 1.000 páginas/mes los primeros 3 meses. A 50–200/mes: **~US$0,08–US$0,30/mes** (o gratis en el período inicial).
- **Categoría:** **no la infieren.** Devuelven texto plano. Para tener categoría habría que sumarle un paso de razonamiento (palabras clave → categoría, o directamente un LLM), con lo cual perdés la ventaja de simplicidad.
- **Parseo del precio:** con el texto crudo aplicás **regex** para encontrar algo con forma de moneda (`\$\s?\d{1,3}(\.\d{3})*(,\d{2})?`). Funciona si el precio está claro; se complica con múltiples números en la imagen (hay que heurísticar cuál es "el precio").

### ¿Cuándo alcanza OCR + reglas y cuándo se queda corto?
- **Alcanza** cuando: el texto es impreso y legible, el precio está aislado y con formato estándar, y **no** necesitás inferir categoría (o te alcanza un mapeo por palabras clave del propio nombre, ej. si el título dice "auricular" → Audio).
- **Se queda corto** cuando: hay etiquetas manuscritas/estilizadas, varios precios, o **necesitás categoría desde el aspecto del producto** (no desde el texto). Ahí el LLM de visión gana claramente.

---

## 3. Alternativas sin IA

### Código de barras / QR
- **Cómo:** escanear el código (EAN/UPC/QR) desde la foto o en vivo con la cámara, del lado del cliente, con una librería JavaScript.
- **Librerías (gratis, open source):**
  - **Quagga2** (`@ericblade/quagga2`, fork mantenido de QuaggaJS): EAN, UPC-A/E, Code 128/39, etc., en el navegador; anda en Chrome/Firefox/Safari/Edge y en Cordova/Ionic/Capacitor.
  - **ZXing / @zxing/library:** amplio soporte de formatos, pero el proyecto original está **en modo mantenimiento** (solo parches de seguridad). Sirve, pero preferir Quagga2 para algo nuevo.
  - (Además, navegadores modernos traen la **BarcodeDetector API** nativa en Chrome/Android, gratis y muy rápida cuando está disponible.)
- **Costo:** **US$0** (corre en el dispositivo).
- **Precisión:** altísima **cuando hay un código nítido y bien enfocado**. Cae con códigos borrosos, arrugados o en ángulo.
- **La trampa:** el código te da un **identificador**, no el título/precio/categoría. Necesitás **una base de datos** que traduzca EAN → producto. Para eso hay APIs (algunas pagas/limitadas) o podés armar tu propia tabla en Supabase con los productos que ya cargaste. El **precio** casi nunca sale del código (varía por proveedor), así que igual hay que leerlo del cartel o tipearlo.
- **Rol recomendado:** **atajo opcional.** Si la foto tiene código, escanealo gratis y prellená lo que puedas; si no, caé al LLM de visión.

### Plantillas / zonas de OCR fijas
- Definir "zonas" fijas de la imagen donde siempre está el precio/nombre y hacer OCR solo ahí. Funciona en documentos con layout **constante** (un formulario, una factura de un proveedor específico). **No sirve** acá porque cada proveedor/góndola/catálogo tiene un layout distinto. Descartado.

---

## Comparación resumida

| Opción | Costo (50–200/mes) | Lee precio impreso | Lee estilizado/manuscrito | Infiere categoría | Complejidad de integración |
|---|---|---|---|---|---|
| **LLM visión (Gemini/Claude/GPT flash-mini)** | ~US$0–0,50 | ✅ muy bien | ✅ bien | ✅ **sí** | Baja (1 llamada API) |
| **Cloud OCR (Google Vision / Textract)** | US$0–0,30 | ✅ bien | ⚠️ limitado | ❌ no | Baja (1 llamada API) |
| **Tesseract self-hosted** | ~US$0 (+cómputo) | ⚠️ regular | ❌ no | ❌ no | Media/Alta (hosting, preproc.) |
| **Código de barras/QR** | US$0 | ❌ (da ID, no precio) | — | ⚠️ vía DB propia | Media (necesita base de datos) |

---

## Recomendación concreta para este caso

### Opción primaria: LLM con visión + salida estructurada
Un solo endpoint en el backend de Next.js que recibe la foto y devuelve `{ titulo, precio, categoria }` en JSON validado por esquema. Es lo que mejor cumple el objetivo real (dejar de tipear) porque resuelve las tres cosas de una, tolera fotos imperfectas e infiere categoría.

- **Modelo sugerido:** **Gemini 2.5 Flash** — el más barato de los capaces, con free tier, buena lectura de texto + razonamiento, SDK Node simple. **Claude Haiku 4.5** o **GPT-4o-mini / GPT-5-mini** son intercambiables casi 1:1 (mismo patrón de integración, solo cambia el SDK y la clave); elegir por preferencia de proveedor. Si en algún momento necesitás más precisión en fotos difíciles, subís a Gemini 3.x Flash / Claude Sonnet 5 sin cambiar la arquitectura.
- **Buenas prácticas mínimas:** pedir salida estructurada (esquema JSON), instruir que devuelva `null` si un dato no es legible (evita alucinaciones), pasar la lista de categorías de MercadoLibre candidatas en el prompt, y **mostrar el resultado al usuario para confirmar/editar** antes de guardar.
- **Costo estimado 50–200 fotos/mes:** **US$0 a ~US$0,50/mes** (Gemini Flash-Lite/Flash prácticamente gratis; Claude Haiku ~US$0,10–0,60).

### Alternativa / fallback: Cloud OCR + reglas (+ código de barras como atajo)
Si querés cero dependencia de un LLM (por costo, por "no alucinaciones", o por privacidad), usá **Google Cloud Vision OCR** para sacar el texto y **regex** para el precio, más un **mapeo palabra-clave → categoría** a partir del nombre. Sumale **escaneo de código de barras** (Quagga2, gratis, en el cliente) como prellenado cuando el producto tiene código y ya está en tu base de Supabase.
- **Límite conocido:** no infiere categoría desde el aspecto (solo desde el texto) y sufre con etiquetas manuscritas/estilizadas. Por eso es fallback, no primaria.
- **Costo estimado 50–200 fotos/mes:** **US$0** (dentro de las 1.000 imágenes/mes gratis de Google Vision).

### En una línea
Empezá con un **LLM de visión barato (Gemini 2.5 Flash o Claude Haiku 4.5) que devuelva JSON**, con confirmación humana antes de guardar. Cuesta centavos al mes a tu volumen y hace lo que el OCR puro no puede: entender qué es el producto y sugerir categoría. Dejá el **OCR de nube + reglas** (y el escaneo de código de barras) como plan B / optimización.

---

## Fuentes

**Precios y capacidades de LLMs con visión**
- OpenAI — precios API: https://developers.openai.com/api/docs/pricing · https://pricepertoken.com/pricing-page/provider/openai · GPT-4o: https://pecollective.com/tools/gpt-4o-pricing/
- OpenAI — tokens por imagen (170/tile + 85 base; 1024×1024 ≈ 765 tokens): https://www.oranlooney.com/post/gpt-cnn/
- Google Gemini — precios API (2.5 Flash $0,30/$2,50; 2.5 Flash-Lite $0,10/$0,40; 3.5 Flash $1,50/$9): https://ai.google.dev/gemini-api/docs/pricing
- Gemini — tokens por imagen (~258–560 tokens/imagen): https://www.metacto.com/blogs/the-true-cost-of-google-gemini-a-guide-to-api-pricing-and-integration
- Anthropic Claude — visión (docs) y cálculo de tokens (~1.380 tokens/megapíxel): https://docs.anthropic.com/en/docs/build-with-claude/vision · https://stellaxon.com/ai/image-token-calculator
- Claude — precios (Haiku 4.5 $1/$5; Sonnet 5 $3/$15, intro $2/$10 hasta 2026-08-31; Opus 4.8 $5/$25): referencia interna de modelos Anthropic (2026-06) · https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration
- Comparador de tokens por imagen (GPT-4V / Claude / Gemini): https://stellaxon.com/ai/image-token-calculator

**OCR tradicional**
- Google Cloud Vision — precios (1.000 img/mes gratis; luego $1,50/1.000): https://cloud.google.com/vision/pricing
- AWS Textract — precios (DetectDocumentText $1,50/1.000 páginas): https://aws.amazon.com/textract/pricing/
- Comparativa OCR (Google Vision / Textract, jul 2026): https://www.buildmvpfast.com/api-costs/ocr

**Código de barras / QR (sin IA)**
- Quagga2 (fork mantenido de QuaggaJS): https://github.com/ericblade/quagga2
- Scanners JS open source (estado 2025–2026, ZXing en modo mantenimiento): https://scanbot.io/blog/popular-open-source-javascript-barcode-scanners/
