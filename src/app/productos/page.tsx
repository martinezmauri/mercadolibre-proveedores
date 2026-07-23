import { Button } from '@/components/ui/button';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import { NuevoProductoDesdeFoto } from '@/components/productos/nuevo-producto-desde-foto';
import { TablaProductos } from '@/components/productos/tabla-productos';
import { productosService } from '@/lib/services/productosService';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { categoriasService } from '@/lib/services/categoriasService';

export default async function ProductosPage() {
  const [productos, proveedores, categorias] = await Promise.all([
    productosService.listar(),
    proveedoresService.listar(),
    categoriasService.listar(),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-semibold">Productos</h1>
        <div className="flex gap-2">
          <NuevoProductoDesdeFoto proveedores={proveedores} categorias={categorias} />
          <FormularioProducto
            proveedores={proveedores}
            categorias={categorias}
            trigger={<Button>Nuevo producto</Button>}
          />
        </div>
      </div>
      <TablaProductos productos={productos} proveedores={proveedores} categorias={categorias} />
    </main>
  );
}
