'use server';

import { revalidatePath } from 'next/cache';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { proveedorSchema } from '@/lib/validation/proveedorSchema';

export async function crearProveedorAction(input: unknown): Promise<void> {
  const parsed = proveedorSchema.parse(input);
  await proveedoresService.crear(parsed);
  revalidatePath('/proveedores');
}

export async function actualizarProveedorAction(id: string, input: unknown): Promise<void> {
  const parsed = proveedorSchema.parse(input);
  await proveedoresService.actualizar(id, parsed);
  revalidatePath('/proveedores');
}

export async function eliminarProveedorAction(id: string): Promise<void> {
  await proveedoresService.eliminar(id);
  revalidatePath('/proveedores');
}
