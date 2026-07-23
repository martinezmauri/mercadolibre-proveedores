import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { extraccionProductoSchema } from '@/lib/validation/extraccionProductoSchema';
import type { Categoria } from '@/types/proveedor';
import type { DatosExtraidosProducto } from '@/types/producto';

export type ImagenMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

function construirPrompt(categorias: Categoria[]): string {
  const nombresCategorias = categorias.map((categoria) => categoria.nombre).join(', ');
  return `Esta es una foto de un producto o su cartel de precio, tomada en el catálogo o depósito de un proveedor mayorista. Si la foto muestra varios productos o varios precios, enfocate en el producto principal o más destacado. Extraé:
- nombre: el nombre o título del producto tal como aparece en la foto.
- precio: el precio numérico que el proveedor le cobra por ese producto (sin símbolo de moneda ni separadores de miles).
- categoria: la categoría que mejor describe el producto, eligiendo EXACTAMENTE uno de estos nombres: ${nombresCategorias}.

Si no podés leer o inferir alguno de estos datos con confianza, devolvé null en ese campo en vez de adivinar. No inventes una categoría que no esté en la lista.`;
}

export const extraccionProductoService = {
  async extraerDatosProducto(
    imageBase64: string,
    mimeType: ImagenMimeType,
    categorias: Categoria[],
  ): Promise<DatosExtraidosProducto> {
    const client = new Anthropic();

    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            { type: 'text', text: construirPrompt(categorias) },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(extraccionProductoSchema) },
    });

    const resultado = response.parsed_output;
    if (!resultado) {
      return { nombre: null, precioMayor: null, categoriaId: null };
    }

    const categoriaCoincidente = categorias.find(
      (categoria) => categoria.nombre.toLowerCase() === resultado.categoria?.toLowerCase(),
    );

    return {
      nombre: resultado.nombre,
      precioMayor: resultado.precio,
      categoriaId: categoriaCoincidente?.id ?? null,
    };
  },
};
