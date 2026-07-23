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
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

type DetalleProductoDialogProps = {
  producto: Producto | null;
  proveedores: Proveedor[];
  categorias: Categoria[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditar: (producto: Producto) => void;
};

export function DetalleProductoDialog({
  producto,
  proveedores,
  categorias,
  open,
  onOpenChange,
  onEditar,
}: DetalleProductoDialogProps) {
  if (!producto) return null;

  const proveedor = proveedores.find((p) => p.id === producto.proveedorId);
  const categoria = categorias.find((c) => c.id === producto.categoriaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{producto.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Proveedor: </span>
            {proveedor?.nombre ?? '—'}
          </div>
          <div>
            <span className="font-medium">URL: </span>
            <a href={producto.url} target="_blank" rel="noreferrer" className="underline">
              {producto.url}
            </a>
          </div>
          {producto.imagenUrl ? (
            <div>
              <span className="font-medium">Imagen: </span>
              <a href={producto.imagenUrl} target="_blank" rel="noreferrer" className="underline">
                {producto.imagenUrl}
              </a>
            </div>
          ) : null}
          <div>
            <span className="font-medium">Precio por menor: </span>
            {producto.precioMenor ?? '—'}
          </div>
          <div>
            <span className="font-medium">Precio por mayor: </span>
            {producto.precioMayor ?? '—'}
          </div>
          <div>
            <span className="font-medium">Categoría: </span>
            {categoria ? <Badge variant="secondary">{categoria.nombre}</Badge> : '—'}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={() => onEditar(producto)}>Editar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
