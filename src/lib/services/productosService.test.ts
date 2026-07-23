import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productosService } from './productosService';
import { createQueryMock } from './testUtils/supabaseQueryMock';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

const mockedCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;

describe('productosService', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  describe('listar', () => {
    it('devuelve los productos mapeados desde snake_case', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({
          data: [
            {
              id: 'p1',
              proveedor_id: 'prov1',
              categoria_id: 'cat1',
              nombre: 'Termo 1L',
              url: 'https://ejemplo.com/termo',
              imagen_url: 'https://ejemplo.com/termo.jpg',
              precio_menor: 15000,
              precio_mayor: 12000,
              created_at: '2026-07-23T00:00:00.000Z',
            },
          ],
          error: null,
        })
      );
      mockedCreateClient.mockReturnValue({ from });

      const result = await productosService.listar();

      expect(from).toHaveBeenCalledWith('productos');
      expect(result).toEqual([
        {
          id: 'p1',
          proveedorId: 'prov1',
          categoriaId: 'cat1',
          nombre: 'Termo 1L',
          url: 'https://ejemplo.com/termo',
          imagenUrl: 'https://ejemplo.com/termo.jpg',
          precioMenor: 15000,
          precioMayor: 12000,
          createdAt: '2026-07-23T00:00:00.000Z',
        },
      ]);
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'timeout' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(productosService.listar()).rejects.toThrow('No se pudieron cargar los productos: timeout');
    });
  });

  describe('crear', () => {
    it('inserta el producto y devuelve el registro mapeado', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({
          data: {
            id: 'p1',
            proveedor_id: 'prov1',
            categoria_id: null,
            nombre: 'Termo 1L',
            url: 'https://ejemplo.com/termo',
            imagen_url: null,
            precio_menor: 15000,
            precio_mayor: null,
            created_at: '2026-07-23T00:00:00.000Z',
          },
          error: null,
        })
      );
      mockedCreateClient.mockReturnValue({ from });

      const result = await productosService.crear({
        proveedorId: 'prov1',
        categoriaId: null,
        nombre: 'Termo 1L',
        url: 'https://ejemplo.com/termo',
        imagenUrl: null,
        precioMenor: 15000,
        precioMayor: null,
      });

      expect(from).toHaveBeenCalledWith('productos');
      expect(result.id).toBe('p1');
      expect(result.proveedorId).toBe('prov1');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(
        productosService.crear({
          proveedorId: 'prov1',
          categoriaId: null,
          nombre: 'Termo 1L',
          url: 'https://ejemplo.com/termo',
          imagenUrl: null,
          precioMenor: null,
          precioMayor: null,
        })
      ).rejects.toThrow('No se pudo crear el producto: fk violation');
    });
  });

  describe('actualizar', () => {
    it('actualiza el producto y devuelve el registro mapeado', async () => {
      const from = vi.fn().mockReturnValue(
        createQueryMock({
          data: {
            id: 'p1',
            proveedor_id: 'prov1',
            categoria_id: 'cat1',
            nombre: 'Termo 1L (actualizado)',
            url: 'https://ejemplo.com/termo',
            imagen_url: null,
            precio_menor: 16000,
            precio_mayor: 13000,
            created_at: '2026-07-23T00:00:00.000Z',
          },
          error: null,
        })
      );
      mockedCreateClient.mockReturnValue({ from });

      const result = await productosService.actualizar('p1', {
        proveedorId: 'prov1',
        categoriaId: 'cat1',
        nombre: 'Termo 1L (actualizado)',
        url: 'https://ejemplo.com/termo',
        imagenUrl: null,
        precioMenor: 16000,
        precioMayor: 13000,
      });

      expect(result.nombre).toBe('Termo 1L (actualizado)');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'not found' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(
        productosService.actualizar('p1', {
          proveedorId: 'prov1',
          categoriaId: null,
          nombre: 'x',
          url: 'https://ejemplo.com',
          imagenUrl: null,
          precioMenor: null,
          precioMayor: null,
        })
      ).rejects.toThrow('No se pudo actualizar el producto: not found');
    });
  });

  describe('eliminar', () => {
    it('elimina el producto por id', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 1 }));
      mockedCreateClient.mockReturnValue({ from });

      await productosService.eliminar('p1');

      expect(from).toHaveBeenCalledWith('productos');
    });

    it('lanza un error legible si Supabase falla', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: { message: 'fk violation' } }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(productosService.eliminar('p1')).rejects.toThrow('No se pudo eliminar el producto: fk violation');
    });

    it('lanza un error legible si el producto ya no existe', async () => {
      const from = vi.fn().mockReturnValue(createQueryMock({ data: null, error: null, count: 0 }));
      mockedCreateClient.mockReturnValue({ from });

      await expect(productosService.eliminar('p1')).rejects.toThrow(
        'El producto ya no existe (probablemente ya fue eliminado por otra persona).'
      );
    });
  });
});
