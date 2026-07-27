import { describe, it, expect, vi } from 'vitest';
import { categoriasGastoService } from './categoriasGastoService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

describe('categoriasGastoService.listar', () => {
  it('devuelve las categorías de gasto ordenadas por nombre', async () => {
    const queryMock = createQueryMock({
      data: [
        { id: '1', nombre: 'Envíos', color: 'cyan' },
        { id: '2', nombre: 'Insumos/stock', color: 'blue' },
      ],
      error: null,
    });
    const from = vi.fn().mockReturnValue(queryMock);
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const result = await categoriasGastoService.listar();

    expect(from).toHaveBeenCalledWith('categorias_gasto');
    expect(queryMock.select).toHaveBeenCalledWith('id, nombre, color');
    expect(queryMock.order).toHaveBeenCalledWith('nombre');
    expect(result).toEqual([
      { id: '1', nombre: 'Envíos', color: 'cyan' },
      { id: '2', nombre: 'Insumos/stock', color: 'blue' },
    ]);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    await expect(categoriasGastoService.listar()).rejects.toThrow(
      'No se pudieron cargar las categorías de gasto: timeout'
    );
  });
});
