import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { almacenamientoService } from './almacenamientoService';

const mockedCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;

describe('almacenamientoService', () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  describe('subirImagenProducto', () => {
    it('sube el archivo y devuelve la URL pública', async () => {
      const upload = vi.fn().mockResolvedValue({ data: { path: 'abc.jpg' }, error: null });
      const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://ejemplo.com/abc.jpg' } });
      const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
      mockedCreateClient.mockReturnValue({ storage: { from } });

      const url = await almacenamientoService.subirImagenProducto(Buffer.from('foto'), 'image/jpeg');

      expect(url).toBe('https://ejemplo.com/abc.jpg');
      expect(from).toHaveBeenCalledWith('productos');
      expect(upload).toHaveBeenCalledWith(expect.stringMatching(/\.jpg$/), expect.any(Buffer), {
        contentType: 'image/jpeg',
      });
    });

    it('lanza un error legible si Supabase Storage falla', async () => {
      const upload = vi.fn().mockResolvedValue({ data: null, error: { message: 'bucket no encontrado' } });
      const getPublicUrl = vi.fn();
      const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
      mockedCreateClient.mockReturnValue({ storage: { from } });

      await expect(
        almacenamientoService.subirImagenProducto(Buffer.from('foto'), 'image/png')
      ).rejects.toThrow('No se pudo subir la imagen: bucket no encontrado');
    });
  });
});
