'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { crearColumnas } from '@/components/proveedores/columnas-proveedores';
import type { Categoria, Proveedor } from '@/types/proveedor';

type TablaProveedoresProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

export function TablaProveedores({ proveedores, categorias }: TablaProveedoresProps) {
  const columns = useMemo(() => crearColumnas(categorias), [categorias]);

  return <DataTable columns={columns} data={proveedores} emptyMessage="No hay proveedores cargados" />;
}
