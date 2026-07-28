'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import { BotonEliminarProveedor } from '@/components/proveedores/boton-eliminar-proveedor';
import { badgeColorClasses } from '@/lib/badgeColors';
import { cn } from '@/lib/utils';
import type { Categoria, Proveedor } from '@/types/proveedor';

export function crearColumnas(categorias: Categoria[]): ColumnDef<Proveedor>[] {
  return [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'url',
      header: 'URL',
      cell: ({ row }) =>
        row.original.url ? (
          <a href={row.original.url} target="_blank" rel="noreferrer" className="underline">
            {row.original.url}
          </a>
        ) : (
          '—'
        ),
    },
    { accessorKey: 'compraMinima', header: 'Compra mínima' },
    {
      id: 'categorias',
      header: 'Categorías',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.categorias.map((categoria) => (
            <Badge key={categoria.id} variant="outline" className={cn(badgeColorClasses(categoria.color))}>
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
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <FormularioProveedor
            categorias={categorias}
            proveedor={row.original}
            trigger={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
          <BotonEliminarProveedor proveedorId={row.original.id} proveedorNombre={row.original.nombre} />
        </div>
      ),
    },
  ];
}
