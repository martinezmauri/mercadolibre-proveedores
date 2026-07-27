'use server';

import { revalidatePath } from 'next/cache';
import { toActionResult, type ActionResult } from '@/lib/actionResult';
import { gastosService } from '@/lib/services/gastosService';
import { gastoSchema } from '@/lib/validation/gastoSchema';

export async function crearGastoAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = gastoSchema.parse(input);
    await gastosService.crear(parsed);
    revalidatePath('/gastos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function actualizarGastoAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = gastoSchema.parse(input);
    await gastosService.actualizar(id, parsed);
    revalidatePath('/gastos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function eliminarGastoAction(id: string): Promise<ActionResult> {
  try {
    await gastosService.eliminar(id);
    revalidatePath('/gastos');
    return { success: true };
  } catch (error) {
    return toActionResult(error);
  }
}
