'use server';

import { revalidatePath } from 'next/cache';
import { toActionResult, type ActionResult } from '@/lib/actionResult';
import { productosService } from '@/lib/services/productosService';
import { productoSchema } from '@/lib/validation/productoSchema';

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
