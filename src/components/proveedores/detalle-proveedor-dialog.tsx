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
import type { Proveedor, TipoContacto } from '@/types/proveedor';

type DetalleProveedorDialogProps = {
  proveedor: Proveedor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditar: (proveedor: Proveedor) => void;
};

const ETIQUETA_TIPO_CONTACTO: Record<TipoContacto, string> = {
  telefono: 'Teléfono',
  whatsapp: 'WhatsApp',
  email: 'Email',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  direccion: 'Dirección',
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
            {proveedor.url ? (
              <a href={proveedor.url} target="_blank" rel="noreferrer" className="underline">
                {proveedor.url}
              </a>
            ) : (
              '—'
            )}
          </div>
          <div>
            <span className="font-medium">Compra mínima: </span>
            {proveedor.compraMinima ?? '—'}
          </div>
          <div>
            <span className="font-medium">Contactos:</span>
            {proveedor.contactos.length === 0 ? (
              <p className="mt-1 text-muted-foreground">—</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {proveedor.contactos.map((contacto) => (
                  <li key={contacto.id}>
                    <span className="text-muted-foreground">{ETIQUETA_TIPO_CONTACTO[contacto.tipo]}: </span>
                    {contacto.valor}
                  </li>
                ))}
              </ul>
            )}
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
          {proveedor.notas ? (
            <div>
              <span className="font-medium">Notas: </span>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{proveedor.notas}</p>
            </div>
          ) : null}
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
