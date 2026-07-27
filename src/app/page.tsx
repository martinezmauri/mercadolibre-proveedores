import { KpiCard } from '@/components/inicio/kpi-card';
import { proveedoresService } from '@/lib/services/proveedoresService';
import { productosService } from '@/lib/services/productosService';
import { gastosService } from '@/lib/services/gastosService';

const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export default async function Home() {
  const [proveedores, productos, gastos] = await Promise.all([
    proveedoresService.listar(),
    productosService.listar(),
    gastosService.listar(),
  ]);

  const totalGastos = gastos.reduce((suma, gasto) => suma + gasto.monto, 0);

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumen general del emprendimiento.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Proveedores" value={String(proveedores.length)} />
        <KpiCard label="Productos" value={String(productos.length)} />
        <KpiCard label="Gastos" value={FORMATO_MONEDA.format(totalGastos)} />
      </div>
    </main>
  );
}
