import { describe, it, expect, vi } from 'vitest';
import { categoriasService } from './categoriasService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

describe('categoriasService.listar', () => {
  it('devuelve las categorías ordenadas por nombre', async () => {
    const queryMock = createQueryMock({
      data: [
        { id: '1', nombre: 'cocina', color: 'orange' },
        { id: '2', nombre: 'hogar', color: 'amber' },
      ],
      error: null,
    });
    const from = vi.fn().mockReturnValue(queryMock);
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const result = await categoriasService.listar();

    expect(from).toHaveBeenCalledWith('categorias');
    expect(queryMock.select).toHaveBeenCalledWith('id, nombre, color');
    expect(queryMock.order).toHaveBeenCalledWith('nombre');
    expect(result).toEqual([
      { id: '1', nombre: 'cocina', color: 'orange' },
      { id: '2', nombre: 'hogar', color: 'amber' },
    ]);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    await expect(categoriasService.listar()).rejects.toThrow(
      'No se pudieron cargar las categorías: timeout'
    );
  });
});
