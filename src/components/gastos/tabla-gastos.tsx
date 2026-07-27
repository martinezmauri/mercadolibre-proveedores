'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { crearColumnas } from '@/components/gastos/columnas-gastos';
import type { CategoriaGasto, Gasto, Persona } from '@/types/gasto';

type TablaGastosProps = {
  gastos: Gasto[];
  personas: Persona[];
  categorias: CategoriaGasto[];
};

export function TablaGastos({ gastos, personas, categorias }: TablaGastosProps) {
  const columns = useMemo(() => crearColumnas({ personas, categorias }), [personas, categorias]);

  return (
    <DataTable
      columns={columns}
      data={gastos}
      emptyMessage="No hay gastos cargados"
      className="rounded-lg border bg-card"
    />
  );
}
