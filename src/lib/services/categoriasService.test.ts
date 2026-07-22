import { describe, it, expect, vi } from 'vitest';
import { categoriasService } from './categoriasService';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

describe('categoriasService.listar', () => {
  it('devuelve las categorías ordenadas por nombre', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: '1', nombre: 'cocina' },
        { id: '2', nombre: 'hogar' },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const result = await categoriasService.listar();

    expect(from).toHaveBeenCalledWith('categorias');
    expect(select).toHaveBeenCalledWith('id, nombre');
    expect(order).toHaveBeenCalledWith('nombre');
    expect(result).toEqual([
      { id: '1', nombre: 'cocina' },
      { id: '2', nombre: 'hogar' },
    ]);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'timeout' } });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    await expect(categoriasService.listar()).rejects.toThrow(
      'No se pudieron cargar las categorías: timeout'
    );
  });
});
