import { Button } from '@/components/ui/button';
import { FormularioGasto } from '@/components/gastos/formulario-gasto';
import { ListadoGastos } from '@/components/gastos/listado-gastos';
import { gastosService } from '@/lib/services/gastosService';
import { personasService } from '@/lib/services/personasService';
import { categoriasGastoService } from '@/lib/services/categoriasGastoService';

export default async function GastosPage() {
  const [gastos, personas, categorias] = await Promise.all([
    gastosService.listar(),
    personasService.listar(),
    categoriasGastoService.listar(),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrá y controlá los gastos operativos del emprendimiento.
          </p>
        </div>
        <FormularioGasto personas={personas} categorias={categorias} trigger={<Button>Nuevo gasto</Button>} />
      </div>
      <ListadoGastos gastos={gastos} personas={personas} categorias={categorias} />
    </main>
  );
}
