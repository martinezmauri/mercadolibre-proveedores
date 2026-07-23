import { describe, it, expect } from 'vitest';
import { proveedorSchema } from './proveedorSchema';

const baseInput = {
  nombre: 'Proveedor Test',
  compraMinima: null,
  whatsapp: null,
  categoriaIds: [],
};

describe('proveedorSchema url', () => {
  it('acepta URLs http/https válidas', () => {
    const result = proveedorSchema.safeParse({ ...baseInput, url: 'https://example.com' });

    expect(result.success).toBe(true);
  });

  it('rechaza URLs con esquema javascript: (XSS almacenado)', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: 'javascript:alert(document.cookie)',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Ingresá una URL válida');
    }
  });

  it('rechaza URLs con esquema data:', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: 'data:text/html,<script>alert(1)</script>',
    });

    expect(result.success).toBe(false);
  });
});
