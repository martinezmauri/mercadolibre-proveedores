'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import { BotonEliminarProducto } from '@/components/productos/boton-eliminar-producto';
import { badgeColorClasses } from '@/lib/badgeColors';
import { cn } from '@/lib/utils';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

type CrearColumnasParams = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function crearColumnas({ proveedores, categorias }: CrearColumnasParams): ColumnDef<Producto>[] {
  const proveedorPorId = new Map(proveedores.map((p) => [p.id, p.nombre]));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));

  return [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      id: 'proveedor',
      header: 'Proveedor',
      cell: ({ row }) => proveedorPorId.get(row.original.proveedorId) ?? '—',
    },
    {
      id: 'categoria',
      header: 'Categoría',
      cell: ({ row }) => {
        const categoria = row.original.categoriaId ? categoriaPorId.get(row.original.categoriaId) : undefined;
        if (!categoria) return null;
        return (
          <Badge variant="outline" className={cn(badgeColorClasses(categoria.color))}>
            {categoria.nombre}
          </Badge>
        );
      },
    },
    { accessorKey: 'precioMenor', header: 'Precio menor' },
    { accessorKey: 'precioMayor', header: 'Precio mayor' },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <FormularioProducto
            proveedores={proveedores}
            categorias={categorias}
            producto={row.original}
            trigger={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
          <BotonEliminarProducto productoId={row.original.id} productoNombre={row.original.nombre} />
        </div>
      ),
    },
  ];
}
