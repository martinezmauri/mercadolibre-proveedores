'use server';

import { revalidatePath } from 'next/cache';
import { toActionResult, type ActionResult } from '@/lib/actionResult';
import { almacenamientoService } from '@/lib/services/almacenamientoService';
import { categoriasService } from '@/lib/services/categoriasService';
import { extraccionProductoService, type ImagenMimeType } from '@/lib/services/extraccionProductoService';
import { productosService } from '@/lib/services/productosService';
import { productoSchema } from '@/lib/validation/productoSchema';
import type { DatosExtraidosProducto } from '@/types/producto';

export async function crearProductoAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = productoSchema.parse(input);
    await productosService.crear(parsed);
    revalidatePath('/productos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function actualizarProductoAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = productoSchema.parse(input);
    await productosService.actualizar(id, parsed);
    revalidatePath('/productos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function eliminarProductoAction(id: string): Promise<ActionResult> {
  try {
    await productosService.eliminar(id);
    revalidatePath('/productos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

const TAMANIO_MAXIMO_BYTES = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function esImagenMimeTypeValido(tipo: string): tipo is ImagenMimeType {
  return TIPOS_PERMITIDOS.includes(tipo);
}

export type AnalisisFotoResult =
  | { success: true; data: DatosExtraidosProducto & { imagenUrl: string } }
  | { success: false; error: string };

export async function analizarFotoProductoAction(formData: FormData): Promise<AnalisisFotoResult> {
  const archivo = formData.get('foto');
  if (!(archivo instanceof File)) {
    return { success: false, error: 'No se recibió ninguna foto' };
  }

  if (archivo.size > TAMANIO_MAXIMO_BYTES) {
    return { success: false, error: 'La foto no puede pesar más de 10 MB' };
  }

  if (!esImagenMimeTypeValido(archivo.type)) {
    return { success: false, error: 'Formato de imagen no soportado. Usá JPG, PNG, WEBP o GIF.' };
  }

  const mimeType = archivo.type;

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const [imagenUrl, categorias] = await Promise.all([
      almacenamientoService.subirImagenProducto(buffer, mimeType),
      categoriasService.listar(),
    ]);

    const datos = await extraccionProductoService.extraerDatosProducto(
      buffer.toString('base64'),
      mimeType,
      categorias,
    );

    return { success: true, data: { ...datos, imagenUrl } };
  } catch (error) {
    console.error('Error al analizar foto de producto:', error);
    return {
      success: false,
      error: 'No se pudo analizar la foto. Intentá de nuevo o cargá el producto manualmente.',
    };
  }
}
