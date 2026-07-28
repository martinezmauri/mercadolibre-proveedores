'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Categoria } from '@/types/proveedor';

const TODAS_LAS_CATEGORIAS = 'todas-las-categorias';

type FiltrosProveedoresProps = {
  categorias: Categoria[];
};

export function FiltrosProveedores({ categorias }: FiltrosProveedoresProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '');

  function actualizarParams(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) {
        params.set(clave, valor);
      } else {
        params.delete(clave);
      }
    }
    params.delete('pagina');
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busqueda !== (searchParams.get('q') ?? '')) {
        actualizarParams({ q: busqueda || null });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          className="w-full pl-9 sm:w-64"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>
      <Select
        value={searchParams.get('categoria') ?? TODAS_LAS_CATEGORIAS}
        onValueChange={(value) => actualizarParams({ categoria: value === TODAS_LAS_CATEGORIAS ? null : value })}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Rubro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS_LAS_CATEGORIAS}>Todos los rubros</SelectItem>
          {categorias.map((categoria) => (
            <SelectItem key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
