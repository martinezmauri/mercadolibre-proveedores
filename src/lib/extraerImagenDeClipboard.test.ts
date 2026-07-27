import { describe, it, expect } from 'vitest';
import { extraerImagenDeClipboard } from './extraerImagenDeClipboard';

describe('extraerImagenDeClipboard', () => {
  it('devuelve el File cuando hay un item de imagen', () => {
    const archivo = new File(['contenido'], 'foto.png', { type: 'image/png' });
    const items = [{ kind: 'file', type: 'image/png', getAsFile: () => archivo }];

    const resultado = extraerImagenDeClipboard(items);

    expect(resultado).toBe(archivo);
  });

  it('devuelve null cuando solo hay items de texto', () => {
    const items = [{ kind: 'string', type: 'text/plain', getAsFile: () => null }];

    const resultado = extraerImagenDeClipboard(items);

    expect(resultado).toBeNull();
  });

  it('devuelve null cuando la lista está vacía', () => {
    const resultado = extraerImagenDeClipboard([]);

    expect(resultado).toBeNull();
  });

  it('devuelve la imagen cuando hay varios items y solo uno es de imagen', () => {
    const archivo = new File(['contenido'], 'foto.jpg', { type: 'image/jpeg' });
    const items = [
      { kind: 'string', type: 'text/plain', getAsFile: () => null },
      { kind: 'file', type: 'image/jpeg', getAsFile: () => archivo },
      { kind: 'string', type: 'text/html', getAsFile: () => null },
    ];

    const resultado = extraerImagenDeClipboard(items);

    expect(resultado).toBe(archivo);
  });
});
