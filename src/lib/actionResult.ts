import { z } from 'zod';

export type ActionResult = { success: true } | { success: false; error: string };

export function toActionResult(error: unknown): ActionResult {
  if (error instanceof z.ZodError) {
    return { success: false, error: error.issues[0]?.message ?? 'Datos inválidos' };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: 'Ocurrió un error inesperado' };
}
