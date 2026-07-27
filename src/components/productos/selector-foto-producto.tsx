'use client';

import { useEffect, useRef, type ClipboardEvent } from 'react';
import { ClipboardPaste, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extraerImagenDeClipboard } from '@/lib/extraerImagenDeClipboard';
import { cn } from '@/lib/utils';

type SelectorFotoProductoProps = {
  archivo: File | null;
  onArchivoChange: (archivo: File | null) => void;
  disabled: boolean;
};

export function SelectorFotoProducto({ archivo, onArchivoChange, disabled }: SelectorFotoProductoProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!archivo || !imgRef.current) return;

    const url = URL.createObjectURL(archivo);
    imgRef.current.src = url;

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  function manejarPaste(e: ClipboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const imagen = extraerImagenDeClipboard(e.clipboardData.items);
    if (imagen) onArchivoChange(imagen);
  }

  if (archivo) {
    return (
      <div className="space-y-2">
        {/* Preview de un archivo local (blob: URL) — next/image no aporta nada acá. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          alt="Preview de la foto del producto"
          className="max-h-48 w-full rounded-md border object-contain"
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => onArchivoChange(null)} disabled={disabled}>
          <X />
          Quitar foto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(e) => onArchivoChange(e.target.files?.[0] ?? null)}
      />
      <div
        tabIndex={disabled ? -1 : 0}
        aria-label="Pegar imagen: hacé clic y presioná Ctrl+V"
        onPaste={manejarPaste}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input py-6 text-center text-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <ClipboardPaste className="h-4 w-4" />
        <span>Pegá una imagen acá (Ctrl+V)</span>
      </div>
    </div>
  );
}
