'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { crearColumnas } from '@/components/proveedores/columnas-proveedores';
import { DetalleProveedorDialog } from '@/components/proveedores/detalle-proveedor-dialog';
import type { Categoria, Proveedor } from '@/types/proveedor';

type TablaProveedoresProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function TablaProveedores({ proveedores, categorias }: TablaProveedoresProps) {
  const columns = useMemo(() => crearColumnas(categorias), [categorias]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);

  return (
    <>
      <DataTable
        columns={columns}
        data={proveedores}
        emptyMessage="No hay proveedores cargados"
        onRowClick={setProveedorSeleccionado}
      />
      <DetalleProveedorDialog
        proveedor={proveedorSeleccionado}
        categorias={categorias}
        open={proveedorSeleccionado !== null}
        onOpenChange={(open) => {
          if (!open) setProveedorSeleccionado(null);
        }}
      />
    </>
  );
}
