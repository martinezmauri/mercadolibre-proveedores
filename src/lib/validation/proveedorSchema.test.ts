import { describe, it, expect } from 'vitest';
import { proveedorSchema } from './proveedorSchema';

const baseInput = {
  nombre: 'Proveedor Test',
  compraMinima: null,
  notas: null,
  categoriaIds: [],
  contactos: [],
};

describe('proveedorSchema url', () => {
  it('acepta URLs http/https válidas', () => {
    const result = proveedorSchema.safeParse({ ...baseInput, url: 'https://example.com' });

    expect(result.success).toBe(true);
  });

  it('acepta que la URL sea null (proveedor sin sitio web)', () => {
    const result = proveedorSchema.safeParse({ ...baseInput, url: null });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBeNull();
    }
  });

  it('acepta string vacío y lo normaliza a null', () => {
    const result = proveedorSchema.safeParse({ ...baseInput, url: '' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBeNull();
    }
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

describe('proveedorSchema contactos', () => {
  it('acepta una lista de contactos con tipos válidos', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: null,
      contactos: [
        { tipo: 'telefono', valor: '11 4444-5555' },
        { tipo: 'instagram', valor: '@mayorista' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rechaza un tipo de contacto que no está en la lista permitida', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: null,
      contactos: [{ tipo: 'fax', valor: '123' }],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza un contacto con valor vacío', () => {
    const result = proveedorSchema.safeParse({
      ...baseInput,
      url: null,
      contactos: [{ tipo: 'telefono', valor: '' }],
    });

    expect(result.success).toBe(false);
  });
});
