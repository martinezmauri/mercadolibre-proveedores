import { z } from 'zod';

export const productoSchema = z.object({
  proveedorId: z.string().min(1, 'Seleccioná un proveedor'),
  categoriaId: z.string().nullable(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  url: z.string().url({ protocol: /^https?$/, error: 'Ingresá una URL válida' }),
  imagenUrl: z.string().url({ protocol: /^https?$/, error: 'Ingresá una URL de imagen válida' }).nullable(),
  precioMenor: z.coerce.number().min(0, 'El precio no puede ser negativo').nullable(),
  precioMayor: z.coerce.number().min(0, 'El precio no puede ser negativo').nullable(),
});

export type ProductoFormValues = z.infer<typeof productoSchema>;
