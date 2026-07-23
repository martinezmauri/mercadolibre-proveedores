'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Proveedor } from '@/types/proveedor';

type DetalleProveedorDialogProps = {
  proveedor: Proveedor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditar: (proveedor: Proveedor) => void;
};

export function DetalleProveedorDialog({
  proveedor,
  open,
  onOpenChange,
  onEditar,
}: DetalleProveedorDialogProps) {
  if (!proveedor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{proveedor.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">URL: </span>
            <a href={proveedor.url} target="_blank" rel="noreferrer" className="underline">
              {proveedor.url}
            </a>
          </div>
          <div>
            <span className="font-medium">Compra mínima: </span>
            {proveedor.compraMinima ?? '—'}
          </div>
          <div>
            <span className="font-medium">WhatsApp: </span>
            {proveedor.whatsapp ?? '—'}
          </div>
          <div>
            <span className="font-medium">Categorías:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {proveedor.categorias.map((categoria) => (
                <Badge key={categoria.id} variant="secondary">
                  {categoria.nombre}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={() => onEditar(proveedor)}>Editar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
