import { z } from 'zod';

export const gastoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  personaId: z.string().min(1, 'Seleccioná quién gastó'),
  categoriaId: z.string().nullable(),
  monto: z.coerce.number().positive('El monto debe ser mayor a cero'),
});

export type GastoFormValues = z.infer<typeof gastoSchema>;
