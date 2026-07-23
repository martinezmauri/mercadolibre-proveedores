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
    it('llama a la RPC crear_proveedor con los parámetros correctos y devuelve el registro completo', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: 'p1', error: null });
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
      const from = vi.fn().mockReturnValue(finalRead);

      mockedCreateClient.mockReturnValue({ rpc, from });

      const result = await proveedoresService.crear({
        nombre: 'Mayorista Uno',
        url: 'https://mayorista-uno.com',
        compraMinima: 100,
        whatsapp: '5491122334455',
        categoriaIds: ['c1'],
      });

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('crear_proveedor', {
        p_nombre: 'Mayorista Uno',
        p_url: 'https://mayorista-uno.com',
        p_compra_minima: 100,
        p_whatsapp: '5491122334455',
        p_categoria_ids: ['c1'],
      });
      expect(from).toHaveBeenCalledWith('proveedores');
      expect(result.id).toBe('p1');
      expect(result.categorias).toEqual([{ id: 'c1', nombre: 'hogar' }]);
    });

    it('lanza un error legible y no toca la tabla si la RPC falla (atomicidad: una sola llamada de red)', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'fk violation' } });
      const from = vi.fn();

      mockedCreateClient.mockReturnValue({ rpc, from });

      await expect(
        proveedoresService.crear({
          nombre: 'Mayorista Uno',
          url: 'https://mayorista-uno.com',
          compraMinima: 100,
          whatsapp: '5491122334455',
          categoriaIds: ['c1'],
        })
      ).rejects.toThrow('No se pudo crear el proveedor: fk violation');

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('llama a la RPC actualizar_proveedor con los parámetros correctos y devuelve el registro completo', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
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
      const from = vi.fn().mockReturnValue(finalRead);

      mockedCreateClient.mockReturnValue({ rpc, from });

      const result = await proveedoresService.actualizar('p1', {
        nombre: 'Mayorista Uno Actualizado',
        url: 'https://mayorista-uno.com',
        compraMinima: 150,
        whatsapp: '5491122334455',
        categoriaIds: ['c2'],
      });

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('actualizar_proveedor', {
        p_id: 'p1',
        p_nombre: 'Mayorista Uno Actualizado',
        p_url: 'https://mayorista-uno.com',
        p_compra_minima: 150,
        p_whatsapp: '5491122334455',
        p_categoria_ids: ['c2'],
      });
      expect(from).toHaveBeenCalledWith('proveedores');
      expect(result.nombre).toBe('Mayorista Uno Actualizado');
      expect(result.categorias).toEqual([{ id: 'c2', nombre: 'cocina' }]);
    });

    it('lanza un error legible y no toca la tabla si la RPC falla (atomicidad: una sola llamada de red)', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'fk violation' } });
      const from = vi.fn();

      mockedCreateClient.mockReturnValue({ rpc, from });

      await expect(
        proveedoresService.actualizar('p1', {
          nombre: 'Mayorista Uno Actualizado',
          url: 'https://mayorista-uno.com',
          compraMinima: 150,
          whatsapp: '5491122334455',
          categoriaIds: ['c2'],
        })
      ).rejects.toThrow('No se pudo actualizar el proveedor: fk violation');

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina el proveedor por id', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 1 }));
      mockedCreateClient.mockReturnValue({ from });

      await proveedoresService.eliminar('p1');

      expect(from).toHaveBeenCalledWith('proveedores');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({ data: null, error: { message: 'fk violation' }, count: null })
      );
      mockedCreateClient.mockReturnValue({ from });

      await expect(proveedoresService.eliminar('p1')).rejects.toThrow(
        'No se pudo eliminar el proveedor: fk violation'
      );
    });

    it('lanza un error legible si el proveedor ya no existe', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 0 }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(proveedoresService.eliminar('p1')).rejects.toThrow(
        'El proveedor ya no existe (probablemente ya fue eliminado por otra persona).'
      );
    });
  });
});
