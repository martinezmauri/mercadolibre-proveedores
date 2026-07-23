export function throwOnSupabaseError(error: { message: string } | null, mensaje: string): void {
  if (error) throw new Error(`${mensaje}: ${error.message}`);
}
