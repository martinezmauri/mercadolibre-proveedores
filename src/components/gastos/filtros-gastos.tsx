'use client';

import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CampoFechaGasto, CategoriaGasto, FiltrosGasto, Persona } from '@/types/gasto';

const TODAS_LAS_PERSONAS = 'todas-las-personas';
const TODAS_LAS_CATEGORIAS = 'todas-las-categorias';

type FiltrosGastosProps = {
  personas: Persona[];
  categorias: CategoriaGasto[];
  filtros: FiltrosGasto;
  onFiltrosChange: (filtros: FiltrosGasto) => void;
};

function aFechaISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function FiltrosGastos({ personas, categorias, filtros, onFiltrosChange }: FiltrosGastosProps) {
  const rango: DateRange | undefined = filtros.desde
    ? { from: new Date(filtros.desde), to: filtros.hasta ? new Date(filtros.hasta) : undefined }
    : undefined;

  function handleRangoChange(nuevoRango: DateRange | undefined) {
    onFiltrosChange({
      ...filtros,
      desde: nuevoRango?.from ? aFechaISO(nuevoRango.from) : null,
      hasta: nuevoRango?.to ? aFechaISO(nuevoRango.to) : null,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filtros.personaId ?? TODAS_LAS_PERSONAS}
        onValueChange={(value) =>
          onFiltrosChange({ ...filtros, personaId: value === TODAS_LAS_PERSONAS ? null : value })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Quién gastó" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS_LAS_PERSONAS}>Todas las personas</SelectItem>
          {personas.map((persona) => (
            <SelectItem key={persona.id} value={persona.id}>
              {persona.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filtros.categoriaId ?? TODAS_LAS_CATEGORIAS}
        onValueChange={(value) =>
          onFiltrosChange({ ...filtros, categoriaId: value === TODAS_LAS_CATEGORIAS ? null : value })
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS_LAS_CATEGORIAS}>Todas las categorías</SelectItem>
          {categorias.map((categoria) => (
            <SelectItem key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filtros.campoFecha}
        onValueChange={(value) => onFiltrosChange({ ...filtros, campoFecha: value as CampoFechaGasto })}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at">Fecha de creación</SelectItem>
          <SelectItem value="updated_at">Fecha de actualización</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-64 justify-start font-normal">
            <CalendarIcon className="mr-2 size-4" />
            {filtros.desde ? `${filtros.desde}${filtros.hasta ? ` – ${filtros.hasta}` : ''}` : 'Rango de fechas'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="range" selected={rango} onSelect={handleRangoChange} numberOfMonths={2} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
