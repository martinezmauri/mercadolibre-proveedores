import { z } from 'zod';

export const extraccionProductoSchema = z.object({
  nombre: z.string().nullable(),
  precio: z.number().nullable(),
  categoria: z.string().nullable(),
});

export type ExtraccionProducto = z.infer<typeof extraccionProductoSchema>;
