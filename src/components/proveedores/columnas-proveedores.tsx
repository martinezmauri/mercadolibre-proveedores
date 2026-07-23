'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import { eliminarProveedorAction } from '@/app/proveedores/actions';
import type { Categoria, Proveedor } from '@/types/proveedor';

export function crearColumnas(categorias: Categoria[]): ColumnDef<Proveedor>[] {
  return [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'url',
      header: 'URL',
      cell: ({ row }) => (
        <a href={row.original.url} target="_blank" rel="noreferrer" className="underline">
          {row.original.url}
        </a>
      ),
    },
    { accessorKey: 'compraMinima', header: 'Compra mínima' },
    {
      accessorKey: 'whatsapp',
      header: 'WhatsApp',
      cell: ({ row }) =>
        row.original.whatsapp ? (
          <a
            href={`https://wa.me/${row.original.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {row.original.whatsapp}
          </a>
        ) : null,
    },
    {
      id: 'categorias',
      header: 'Categorías',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.categorias.map((categoria) => (
            <Badge key={categoria.id} variant="secondary">
              {categoria.nombre}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <FormularioProveedor
            categorias={categorias}
            proveedor={row.original}
            trigger={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              const result = await eliminarProveedorAction(row.original.id);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              toast.success('Proveedor eliminado');
            }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];
}
