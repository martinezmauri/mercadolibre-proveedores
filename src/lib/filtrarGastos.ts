import type { FiltrosGasto, Gasto } from '@/types/gasto';

export function filtrarGastos(gastos: Gasto[], filtros: FiltrosGasto): Gasto[] {
  return gastos.filter((gasto) => {
    if (filtros.personaId && gasto.personaId !== filtros.personaId) return false;
    if (filtros.categoriaId && gasto.categoriaId !== filtros.categoriaId) return false;

    const valorFecha = new Date(filtros.campoFecha === 'updated_at' ? gasto.updatedAt : gasto.createdAt);

    if (filtros.desde && valorFecha < new Date(filtros.desde)) return false;

    if (filtros.hasta) {
      const finDelDia = new Date(filtros.hasta);
      finDelDia.setUTCHours(23, 59, 59, 999);
      if (valorFecha > finDelDia) return false;
    }

    return true;
  });
}
