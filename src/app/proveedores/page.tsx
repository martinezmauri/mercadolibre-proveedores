import { Button } from '@/components/ui/button';
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import { TablaProveedores } from '@/components/proveedores/tabla-proveedores';
import { FiltrosProveedores } from '@/components/proveedores/filtros-proveedores';
import { PaginadorProveedores } from '@/components/proveedores/paginador-proveedores';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { categoriasService } from '@/lib/services/categoriasService';

const TAMAÑO_PAGINA = 50;

type ProveedoresPageProps = {
  searchParams: Promise<{ q?: string; categoria?: string; pagina?: string }>;
};

export default async function ProveedoresPage({ searchParams }: ProveedoresPageProps) {
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);

  const [{ proveedores, total }, categorias] = await Promise.all([
    proveedoresService.buscar({
      pagina,
      tamañoPagina: TAMAÑO_PAGINA,
      busqueda: params.q ?? null,
      categoriaId: params.categoria ?? null,
    }),
    categoriasService.listar(),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / TAMAÑO_PAGINA));

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná los proveedores mayoristas del catálogo.
          </p>
        </div>
        <FormularioProveedor categorias={categorias} trigger={<Button>Nuevo proveedor</Button>} />
      </div>
      <FiltrosProveedores categorias={categorias} total={total} />
      <TablaProveedores proveedores={proveedores} categorias={categorias} />
      <PaginadorProveedores paginaActual={pagina} totalPaginas={totalPaginas} />
    </main>
  );
}
