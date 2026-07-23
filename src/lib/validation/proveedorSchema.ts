import { z } from 'zod';

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  url: z.string().url({ protocol: /^https?$/, error: 'Ingresá una URL válida' }),
  compraMinima: z.coerce.number().min(0, 'La compra mínima no puede ser negativa').nullable(),
  whatsapp: z.string().nullable(),
  categoriaIds: z.array(z.string()).default([]),
});

export type ProveedorFormValues = z.infer<typeof proveedorSchema>;
