import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { parseMock, anthropicConstructorMock } = vi.hoisted(() => {
  const parseMock = vi.fn();
  const anthropicConstructorMock = vi.fn().mockImplementation(function () {
    return { messages: { parse: parseMock } };
  });
  return { parseMock, anthropicConstructorMock };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: anthropicConstructorMock,
}));

vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: vi.fn().mockReturnValue({}),
}));

import { extraccionProductoService } from './extraccionProductoService';
import type { Categoria } from '@/types/proveedor';

const CATEGORIAS: Categoria[] = [
  { id: 'cat-1', nombre: 'Electrónica', color: 'blue' },
  { id: 'cat-2', nombre: 'Hogar', color: 'amber' },
];

describe('extraccionProductoService', () => {
  beforeEach(() => {
    parseMock.mockReset();
    anthropicConstructorMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('extraerDatosProducto', () => {
    it('crea el cliente de Anthropic con la API key de CLAUDE_API_KEY', async () => {
      vi.stubEnv('CLAUDE_API_KEY', 'test-key-123');
      parseMock.mockResolvedValue({ parsed_output: null });

      await extraccionProductoService.extraerDatosProducto('base64==', 'image/jpeg', CATEGORIAS);

      expect(anthropicConstructorMock).toHaveBeenCalledWith({ apiKey: 'test-key-123' });
    });

    it('mapea la categoría devuelta (case-insensitive) a su ID real', async () => {
      parseMock.mockResolvedValue({
        parsed_output: { nombre: 'Auriculares Bluetooth', precio: 15000, categoria: 'electrónica' },
      });

      const resultado = await extraccionProductoService.extraerDatosProducto('base64==', 'image/jpeg', CATEGORIAS);

      expect(resultado).toEqual({ nombre: 'Auriculares Bluetooth', precioMayor: 15000, categoriaId: 'cat-1' });
    });

    it('devuelve categoriaId null si la IA no reconoce ninguna categoría de la lista', async () => {
      parseMock.mockResolvedValue({
        parsed_output: { nombre: 'Producto genérico', precio: 500, categoria: 'Inexistente' },
      });

      const resultado = await extraccionProductoService.extraerDatosProducto('base64==', 'image/png', CATEGORIAS);

      expect(resultado.categoriaId).toBeNull();
    });

    it('devuelve todos los campos null si el parseo estructurado falla', async () => {
      parseMock.mockResolvedValue({ parsed_output: null });

      const resultado = await extraccionProductoService.extraerDatosProducto('base64==', 'image/jpeg', CATEGORIAS);

      expect(resultado).toEqual({ nombre: null, precioMayor: null, categoriaId: null });
    });
  });
});
