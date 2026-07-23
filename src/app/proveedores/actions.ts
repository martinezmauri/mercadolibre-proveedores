'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { proveedorSchema } from '@/lib/validation/proveedorSchema';

export type ActionResult = { success: true } | { success: false; error: string };

function toActionResult(error: unknown): ActionResult {
  if (error instanceof z.ZodError) {
    return { success: false, error: error.issues[0]?.message ?? 'Datos inválidos' };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: 'Ocurrió un error inesperado' };
}

export async function crearProveedorAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = proveedorSchema.parse(input);
    await proveedoresService.crear(parsed);
    revalidatePath('/proveedores');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function actualizarProveedorAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = proveedorSchema.parse(input);
    await proveedoresService.actualizar(id, parsed);
    revalidatePath('/proveedores');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function eliminarProveedorAction(id: string): Promise<ActionResult> {
  try {
    await proveedoresService.eliminar(id);
    revalidatePath('/proveedores');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}
