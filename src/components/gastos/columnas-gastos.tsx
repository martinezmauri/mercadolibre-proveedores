'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BotonEliminarGasto } from '@/components/gastos/boton-eliminar-gasto';
import { FormularioGasto } from '@/components/gastos/formulario-gasto';
import { badgeColorClasses } from '@/lib/badgeColors';
import { cn } from '@/lib/utils';
import type { CategoriaGasto, ColorToken, Gasto, Persona } from '@/types/gasto';

const COLOR_POR_PERSONA: Record<string, ColorToken> = {
  'Mauricio Martinez': 'indigo',
  'Jeremias Aruta': 'fuchsia',
};

const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

type CrearColumnasParams = {
  personas: Persona[];
  categorias: CategoriaGasto[];
};

export function crearColumnas({ personas, categorias }: CrearColumnasParams): ColumnDef<Gasto>[] {
  const personaPorId = new Map(personas.map((p) => [p.id, p]));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));

  return [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      id: 'persona',
      header: 'Quién gastó',
      cell: ({ row }) => {
        const persona = personaPorId.get(row.original.personaId);
        if (!persona) return '—';
        const color = COLOR_POR_PERSONA[persona.nombre] ?? 'slate';
        return (
          <Badge variant="outline" className={cn(badgeColorClasses(color))}>
            {persona.nombre}
          </Badge>
        );
      },
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
    {
      id: 'monto',
      header: 'Monto',
      cell: ({ row }) => FORMATO_MONEDA.format(row.original.monto),
    },
    {
      id: 'createdAt',
      header: 'Creado',
      cell: ({ row }) => formatearFecha(row.original.createdAt),
    },
    {
      id: 'updatedAt',
      header: 'Actualizado',
      cell: ({ row }) => formatearFecha(row.original.updatedAt),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <FormularioGasto
            personas={personas}
            categorias={categorias}
            gasto={row.original}
            trigger={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
          <BotonEliminarGasto gastoId={row.original.id} gastoNombre={row.original.nombre} />
        </div>
      ),
    },
  ];
}
