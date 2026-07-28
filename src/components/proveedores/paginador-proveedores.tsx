'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

type PaginadorProveedoresProps = {
  paginaActual: number;
  totalPaginas: number;
};

export function PaginadorProveedores({ paginaActual, totalPaginas }: PaginadorProveedoresProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pagina', String(pagina));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Página {paginaActual} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={paginaActual <= 1} onClick={() => irAPagina(paginaActual - 1)}>
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={paginaActual >= totalPaginas}
          onClick={() => irAPagina(paginaActual + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
