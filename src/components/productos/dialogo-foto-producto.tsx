'use client';

import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { analizarFotoProductoAction } from '@/app/productos/actions';
import type { DatosExtraidosProducto } from '@/types/producto';

type DialogoFotoProductoProps = {
  trigger: React.ReactNode;
  onDatosExtraidos: (datos: DatosExtraidosProducto & { imagenUrl: string }) => void;
};

export function DialogoFotoProducto({ trigger, onDatosExtraidos }: DialogoFotoProductoProps) {
  const [open, setOpen] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  function analizar() {
    if (!archivo) {
      toast.error('Elegí una foto primero');
      return;
    }

    const formData = new FormData();
    formData.set('foto', archivo);

    startTransition(async () => {
      const resultado = await analizarFotoProductoAction(formData);
      if (!resultado.success) {
        toast.error(resultado.error);
        return;
      }

      onDatosExtraidos(resultado.data);
      setOpen(false);
      setArchivo(null);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setArchivo(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto desde foto</DialogTitle>
        </DialogHeader>
        <Input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={isPending}
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
        <DialogFooter>
          <Button type="button" onClick={analizar} disabled={isPending || !archivo}>
            {isPending ? 'Analizando...' : 'Analizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
