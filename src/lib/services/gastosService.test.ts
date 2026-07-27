import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gastosService } from './gastosService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

const mockedCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;

const gastoRow = {
  id: 'g1',
  nombre: 'Compra de cajas',
  persona_id: 'per1',
  categoria_id: 'cat1',
  monto: 5000,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-02T00:00:00.000Z',
};

const gastoEsperado = {
  id: 'g1',
  nombre: 'Compra de cajas',
  personaId: 'per1',
  categoriaId: 'cat1',
  monto: 5000,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
};

describe('gastosService', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  describe('listar', () => {
    it('devuelve todos los gastos sin filtros', async () => {
      const queryMock = createQueryMock({ data: [gastoRow], error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      const result = await gastosService.listar();

      expect(from).toHaveBeenCalledWith('gastos');
      expect(queryMock.eq).not.toHaveBeenCalled();
      expect(queryMock.gte).not.toHaveBeenCalled();
      expect(queryMock.lte).not.toHaveBeenCalled();
      expect(result).toEqual([gastoEsperado]);
    });

    it('filtra por persona y categoría cuando se pasan', async () => {
      const queryMock = createQueryMock({ data: [gastoRow], error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      await gastosService.listar({ personaId: 'per1', categoriaId: 'cat1' });

      expect(queryMock.eq).toHaveBeenCalledWith('persona_id', 'per1');
      expect(queryMock.eq).toHaveBeenCalledWith('categoria_id', 'cat1');
    });

    it('filtra por rango de fechas usando el campo indicado', async () => {
      const queryMock = createQueryMock({ data: [gastoRow], error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      await gastosService.listar({ campoFecha: 'updated_at', desde: '2026-07-01', hasta: '2026-07-31' });

      expect(queryMock.gte).toHaveBeenCalledWith('updated_at', '2026-07-01');
      expect(queryMock.lte).toHaveBeenCalledWith('updated_at', '2026-07-31');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(gastosService.listar()).rejects.toThrow('No se pudieron cargar los gastos: timeout');
    });
  });

  describe('crear', () => {
    it('inserta el gasto y devuelve el registro mapeado', async () => {
      const queryMock = createQueryMock({ data: gastoRow, error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      const result = await gastosService.crear({
        nombre: 'Compra de cajas',
        personaId: 'per1',
        categoriaId: 'cat1',
        monto: 5000,
      });

      expect(from).toHaveBeenCalledWith('gastos');
      expect(queryMock.insert).toHaveBeenCalledWith({
        nombre: 'Compra de cajas',
        persona_id: 'per1',
        categoria_id: 'cat1',
        monto: 5000,
      });
      expect(result).toEqual(gastoEsperado);
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(
        gastosService.crear({ nombre: 'Compra de cajas', personaId: 'per1', categoriaId: 'cat1', monto: 5000 })
      ).rejects.toThrow('No se pudo crear el gasto: fk violation');
    });
  });

  describe('actualizar', () => {
    it('actualiza el gasto seteando updated_at y devuelve el registro mapeado', async () => {
      const queryMock = createQueryMock({ data: gastoRow, error: null });
      const from = vi.fn().mockReturnValue(queryMock);
      mockedCreateClient.mockReturnValue({ from });

      const result = await gastosService.actualizar('g1', {
        nombre: 'Compra de cajas',
        personaId: 'per1',
        categoriaId: 'cat1',
        monto: 5000,
      });

      expect(queryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Compra de cajas',
          persona_id: 'per1',
          categoria_id: 'cat1',
          monto: 5000,
          updated_at: expect.any(String),
        })
      );
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'g1');
      expect(result).toEqual(gastoEsperado);
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(
        gastosService.actualizar('g1', { nombre: 'x', personaId: 'per1', categoriaId: null, monto: 1 })
      ).rejects.toThrow('No se pudo actualizar el gasto: fk violation');
    });
  });

  describe('eliminar', () => {
    it('elimina el gasto por id', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 1 }));
      mockedCreateClient.mockReturnValue({ from });

      await gastosService.eliminar('g1');

      expect(from).toHaveBeenCalledWith('gastos');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({ data: null, error: { message: 'fk violation' }, count: null })
      );
      mockedCreateClient.mockReturnValue({ from });

      await expect(gastosService.eliminar('g1')).rejects.toThrow('No se pudo eliminar el gasto: fk violation');
    });

    it('lanza un error legible si el gasto ya no existe', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 0 }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(gastosService.eliminar('g1')).rejects.toThrow(
        'El gasto ya no existe (probablemente ya fue eliminado por otra persona).'
      );
    });
  });
});
