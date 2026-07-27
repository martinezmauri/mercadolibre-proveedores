import { describe, it, expect, vi } from 'vitest';
import { personasService } from './personasService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

describe('personasService.listar', () => {
  it('devuelve las personas ordenadas por nombre', async () => {
    const queryMock = createQueryMock({
      data: [
        { id: '1', nombre: 'Jeremias Aruta' },
        { id: '2', nombre: 'Mauricio Martinez' },
      ],
      error: null,
    });
    const from = vi.fn().mockReturnValue(queryMock);
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const result = await personasService.listar();

    expect(from).toHaveBeenCalledWith('personas');
    expect(queryMock.select).toHaveBeenCalledWith('id, nombre');
    expect(queryMock.order).toHaveBeenCalledWith('nombre');
    expect(result).toEqual([
      { id: '1', nombre: 'Jeremias Aruta' },
      { id: '2', nombre: 'Mauricio Martinez' },
    ]);
  });

  it('lanza un error legible si Supabase falla', async () => {
    const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    await expect(personasService.listar()).rejects.toThrow('No se pudieron cargar las personas: timeout');
  });
});
