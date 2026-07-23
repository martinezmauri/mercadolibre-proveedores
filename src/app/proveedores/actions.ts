'use server';

import { revalidatePath } from 'next/cache';
import { toActionResult, type ActionResult } from '@/lib/actionResult';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { proveedorSchema } from '@/lib/validation/proveedorSchema';

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
