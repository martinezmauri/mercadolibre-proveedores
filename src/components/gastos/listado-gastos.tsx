'use client';

import { useMemo, useState } from 'react';
import { FiltrosGastos } from '@/components/gastos/filtros-gastos';
import { TablaGastos } from '@/components/gastos/tabla-gastos';
import { filtrarGastos } from '@/lib/filtrarGastos';
import type { CategoriaGasto, FiltrosGasto, Gasto, Persona } from '@/types/gasto';

const FILTROS_INICIALES: FiltrosGasto = {
  personaId: null,
  categoriaId: null,
  campoFecha: 'created_at',
  desde: null,
  hasta: null,
};

type ListadoGastosProps = {
  gastos: Gasto[];
  personas: Persona[];
  categorias: CategoriaGasto[];
};

export function ListadoGastos({ gastos, personas, categorias }: ListadoGastosProps) {
  const [filtros, setFiltros] = useState<FiltrosGasto>(FILTROS_INICIALES);
  const gastosFiltrados = useMemo(() => filtrarGastos(gastos, filtros), [gastos, filtros]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FiltrosGastos personas={personas} categorias={categorias} filtros={filtros} onFiltrosChange={setFiltros} />
        <div className="text-sm text-muted-foreground sm:ml-auto">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />
          {gastosFiltrados.length} {gastosFiltrados.length === 1 ? 'gasto' : 'gastos'}
        </div>
      </div>
      <TablaGastos gastos={gastosFiltrados} personas={personas} categorias={categorias} />
    </div>
  );
}
