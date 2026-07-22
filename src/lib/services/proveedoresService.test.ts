import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proveedoresService } from './proveedoresService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

const mockedCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;

describe('proveedoresService', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  describe('listar', () => {
    it('devuelve los proveedores con sus categorías aplanadas', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({
          data: [
            {
              id: 'p1',
              nombre: 'Mayorista Uno',
              url: 'https://mayorista-uno.com',
              compra_minima: 100,
              whatsapp: '5491122334455',
              created_at: '2026-07-22T00:00:00.000Z',
              proveedor_categorias: [
                { categorias: { id: 'c1', nombre: 'hogar' } },
                { categorias: { id: 'c2', nombre: 'cocina' } },
              ],
            },
          ],
          error: null,
        })
      );
      mockedCreateClient.mockReturnValue({ from });

      const result = await proveedoresService.listar();

      expect(from).toHaveBeenCalledWith('proveedores');
      expect(result).toEqual([
        {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compraMinima: 100,
          whatsapp: '5491122334455',
          createdAt: '2026-07-22T00:00:00.000Z',
          categorias: [
            { id: 'c1', nombre: 'hogar' },
            { id: 'c2', nombre: 'cocina' },
          ],
        },
      ]);
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(proveedoresService.listar()).rejects.toThrow(
        'No se pudieron cargar los proveedores: timeout'
      );
    });
  });

  describe('crear', () => {
    it('inserta el proveedor, asigna categorías y devuelve el registro completo', async () => {
      const insertResult = createQueryMock({ data: { id: 'p1' }, error: null });
      const categoriasInsertResult = createQueryMock({ data: null, error: null });
      const finalRead = createQueryMock({
        data: {
          id: 'p1',
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compra_minima: 100,
          whatsapp: '5491122334455',
          created_at: '2026-07-22T00:00:00.000Z',
          proveedor_categorias: [{ categorias: { id: 'c1', nombre: 'hogar' } }],
        },
        error: null,
      });

      const from = vi
        .fn()
        .mockReturnValueOnce(insertResult)
        .mockReturnValueOnce(categoriasInsertResult)
        .mockReturnValueOnce(finalRead);

      mockedCreateClient.mockReturnValue({ from });

      const result = await proveedoresService.crear({
        nombre: 'Mayorista Uno',
        url: 'https://mayorista-uno.com',
        compraMinima: 100,
        whatsapp: '5491122334455',
        categoriaIds: ['c1'],
      });

      expect(from).toHaveBeenNthCalledWith(1, 'proveedores');
      expect(from).toHaveBeenNthCalledWith(2, 'proveedor_categorias');
      expect(from).toHaveBeenNthCalledWith(3, 'proveedores');
      expect(result.id).toBe('p1');
      expect(result.categorias).toEqual([{ id: 'c1', nombre: 'hogar' }]);
    });
  });

  describe('actualizar', () => {
    it('actualiza los datos y reemplaza las categorías asignadas', async () => {
      const updateResult = createQueryMock({ data: null, error: null });
      const deleteCategoriasResult = createQueryMock({ data: null, error: null });
      const insertCategoriasResult = createQueryMock({ data: null, error: null });
      const finalRead = createQueryMock({
        data: {
          id: 'p1',
          nombre: 'Mayorista Uno Actualizado',
          url: 'https://mayorista-uno.com',
          compra_minima: 150,
          whatsapp: '5491122334455',
          created_at: '2026-07-22T00:00:00.000Z',
          proveedor_categorias: [{ categorias: { id: 'c2', nombre: 'cocina' } }],
        },
        error: null,
      });

      const from = vi
        .fn()
        .mockReturnValueOnce(updateResult)
        .mockReturnValueOnce(deleteCategoriasResult)
        .mockReturnValueOnce(insertCategoriasResult)
        .mockReturnValueOnce(finalRead);

      mockedCreateClient.mockReturnValue({ from });

      const result = await proveedoresService.actualizar('p1', {
        nombre: 'Mayorista Uno Actualizado',
        url: 'https://mayorista-uno.com',
        compraMinima: 150,
        whatsapp: '5491122334455',
        categoriaIds: ['c2'],
      });

      expect(result.nombre).toBe('Mayorista Uno Actualizado');
      expect(result.categorias).toEqual([{ id: 'c2', nombre: 'cocina' }]);
    });

    it('lanza un error legible si falla la eliminación de categorías anteriores', async () => {
      const updateResult = createQueryMock({ data: null, error: null });
      const deleteCategoriasResult = createQueryMock({ data: null, error: { message: 'fk violation' } });

      const from = vi.fn().mockReturnValueOnce(updateResult).mockReturnValueOnce(deleteCategoriasResult);

      mockedCreateClient.mockReturnValue({ from });

      await expect(
        proveedoresService.actualizar('p1', {
          nombre: 'Mayorista Uno Actualizado',
          url: 'https://mayorista-uno.com',
          compraMinima: 150,
          whatsapp: '5491122334455',
          categoriaIds: ['c2'],
        })
      ).rejects.toThrow('No se pudieron eliminar las categorías anteriores: fk violation');
    });
  });

  describe('eliminar', () => {
    it('elimina el proveedor por id', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null }));
      mockedCreateClient.mockReturnValue({ from });

      await proveedoresService.eliminar('p1');

      expect(from).toHaveBeenCalledWith('proveedores');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(proveedoresService.eliminar('p1')).rejects.toThrow(
        'No se pudo eliminar el proveedor: fk violation'
      );
    });
  });
});
