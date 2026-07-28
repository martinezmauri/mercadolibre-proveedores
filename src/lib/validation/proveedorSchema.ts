import { z } from 'zod';

const urlHttpSchema = z.string().url({ protocol: /^https?$/, error: 'Ingresá una URL válida' });

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  url: z
    .string()
    .nullable()
    .transform((valor) => (valor && valor.trim() !== '' ? valor.trim() : null))
    .refine((valor) => valor === null || urlHttpSchema.safeParse(valor).success, {
      message: 'Ingresá una URL válida',
    }),
  compraMinima: z.coerce.number().min(0, 'La compra mínima no puede ser negativa').nullable(),
  notas: z
    .string()
    .nullable()
    .transform((valor) => (valor && valor.trim() !== '' ? valor.trim() : null)),
  categoriaIds: z.array(z.string()).default([]),
  contactos: z
    .array(
      z.object({
        tipo: z.enum(['telefono', 'whatsapp', 'email', 'instagram', 'facebook', 'tiktok', 'direccion']),
        valor: z.string().min(1, 'El valor no puede estar vacío'),
      })
    )
    .default([]),
});

export type ProveedorFormValues = z.infer<typeof proveedorSchema>;
