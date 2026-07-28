import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/services/proveedoresService', () => ({
  proveedoresService: {
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { crearProveedorAction } from './actions';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { revalidatePath } from 'next/cache';

const mockedCrear = proveedoresService.crear as ReturnType<typeof vi.fn>;
const mockedRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>;

const proveedorValido = {
  nombre: 'Mayorista Uno',
  url: 'https://mayorista-uno.com',
  compraMinima: 100,
  notas: null,
  categoriaIds: ['c1'],
  contactos: [{ tipo: 'whatsapp', valor: '5491122334455' }],
};

describe('crearProveedorAction', () => {
  beforeEach(() => {
    mockedCrear.mockReset();
    mockedRevalidatePath.mockReset();
  });

  it('devuelve un error legible en lugar de lanzar cuando la validación falla', async () => {
    const result = await crearProveedorAction({ ...proveedorValido, nombre: '' });

    expect(result).toEqual({ success: false, error: 'El nombre es obligatorio' });
    expect(mockedCrear).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it('devuelve success y revalida la ruta cuando el input es válido y el servicio no falla', async () => {
    mockedCrear.mockResolvedValue({ id: 'p1', ...proveedorValido, createdAt: '2026-07-22T00:00:00.000Z', categorias: [] });

    const result = await crearProveedorAction(proveedorValido);

    expect(result).toEqual({ success: true });
    expect(mockedCrear).toHaveBeenCalledWith(proveedorValido);
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/proveedores');
  });
});
