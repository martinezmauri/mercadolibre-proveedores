'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { crearColumnas } from '@/components/productos/columnas-productos';
import { DetalleProductoDialog } from '@/components/productos/detalle-producto-dialog';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

type TablaProductosProps = {
  productos: Producto[];
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function TablaProductos({ productos, proveedores, categorias }: TablaProductosProps) {
  const columns = useMemo(() => crearColumnas({ proveedores, categorias }), [proveedores, categorias]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productoAEditar, setProductoAEditar] = useState<Producto | null>(null);

  return (
    <>
      <DataTable
        columns={columns}
        data={productos}
        emptyMessage="No hay productos cargados"
        onRowClick={setProductoSeleccionado}
        className="rounded-lg border bg-card"
      />
      <DetalleProductoDialog
        producto={productoSeleccionado}
        proveedores={proveedores}
        categorias={categorias}
        open={productoSeleccionado !== null}
        onOpenChange={(open) => {
          if (!open) setProductoSeleccionado(null);
        }}
        onEditar={(producto) => {
          setProductoSeleccionado(null);
          setProductoAEditar(producto);
        }}
      />
      <FormularioProducto
        proveedores={proveedores}
        categorias={categorias}
        producto={productoAEditar ?? undefined}
        open={productoAEditar !== null}
        onOpenChange={(open) => {
          if (!open) setProductoAEditar(null);
        }}
      />
    </>
  );
}
