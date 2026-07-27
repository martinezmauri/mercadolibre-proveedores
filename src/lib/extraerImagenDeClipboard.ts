type ItemPortapapeles = {
  kind: string;
  type: string;
  getAsFile: () => File | null;
};

export function extraerImagenDeClipboard(items: ArrayLike<ItemPortapapeles>): File | null {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const archivo = item.getAsFile();
      if (archivo) return archivo;
    }
  }
  return null;
}
