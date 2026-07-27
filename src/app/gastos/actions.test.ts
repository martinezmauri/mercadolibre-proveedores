import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/services/gastosService', () => ({
  gastosService: {
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { crearGastoAction } from './actions';
import { gastosService } from '@/lib/services/gastosService';
import { revalidatePath } from 'next/cache';

const mockedCrear = gastosService.crear as ReturnType<typeof vi.fn>;
const mockedRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>;

const gastoValido = {
  nombre: 'Compra de cajas',
  personaId: 'per1',
  categoriaId: 'cat1',
  monto: 5000,
};

describe('crearGastoAction', () => {
  beforeEach(() => {
    mockedCrear.mockReset();
    mockedRevalidatePath.mockReset();
  });

  it('devuelve un error legible en lugar de lanzar cuando la validación falla', async () => {
    const result = await crearGastoAction({ ...gastoValido, nombre: '' });

    expect(result).toEqual({ success: false, error: 'El nombre es obligatorio' });
    expect(mockedCrear).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it('devuelve success y revalida la ruta cuando el input es válido y el servicio no falla', async () => {
    mockedCrear.mockResolvedValue({
      id: 'g1',
      ...gastoValido,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    const result = await crearGastoAction(gastoValido);

    expect(result).toEqual({ success: true });
    expect(mockedCrear).toHaveBeenCalledWith(gastoValido);
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/gastos');
  });
});
