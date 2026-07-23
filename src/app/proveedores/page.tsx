import { Button } from '@/components/ui/button';
import { FormularioProveedor } from '@/components/proveedores/formulario-proveedor';
import { TablaProveedores } from '@/components/proveedores/tabla-proveedores';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { categoriasService } from '@/lib/services/categoriasService';

export default async function ProveedoresPage() {
  const [proveedores, categorias] = await Promise.all([
    proveedoresService.listar(),
    categoriasService.listar(),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-semibold">Proveedores</h1>
        <FormularioProveedor categorias={categorias} trigger={<Button>Nuevo proveedor</Button>} />
      </div>
      <TablaProveedores proveedores={proveedores} categorias={categorias} />
    </main>
  );
}
