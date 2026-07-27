import { describe, it, expect } from 'vitest';
import { filtrarGastos } from './filtrarGastos';
import type { FiltrosGasto, Gasto } from '@/types/gasto';

const FILTROS_BASE: FiltrosGasto = {
  personaId: null,
  categoriaId: null,
  campoFecha: 'created_at',
  desde: null,
  hasta: null,
};

const gastos: Gasto[] = [
  {
    id: 'g1',
    nombre: 'Compra de cajas',
    personaId: 'per1',
    categoriaId: 'cat1',
    monto: 1000,
    createdAt: '2026-07-05T10:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
  },
  {
    id: 'g2',
    nombre: 'Envío MercadoLibre',
    personaId: 'per2',
    categoriaId: 'cat2',
    monto: 2000,
    createdAt: '2026-07-20T23:30:00.000Z',
    updatedAt: '2026-07-20T23:30:00.000Z',
  },
];

describe('filtrarGastos', () => {
  it('devuelve todos los gastos si no hay filtros activos', () => {
    expect(filtrarGastos(gastos, FILTROS_BASE)).toEqual(gastos);
  });

  it('filtra por persona', () => {
    expect(filtrarGastos(gastos, { ...FILTROS_BASE, personaId: 'per1' })).toEqual([gastos[0]]);
  });

  it('filtra por categoría', () => {
    expect(filtrarGastos(gastos, { ...FILTROS_BASE, categoriaId: 'cat2' })).toEqual([gastos[1]]);
  });

  it('filtra por rango de fechas usando created_at', () => {
    const resultado = filtrarGastos(gastos, { ...FILTROS_BASE, desde: '2026-07-15', hasta: '2026-07-25' });
    expect(resultado).toEqual([gastos[1]]);
  });

  it('filtra por rango de fechas usando updated_at cuando se indica ese campo', () => {
    const resultado = filtrarGastos(gastos, {
      ...FILTROS_BASE,
      campoFecha: 'updated_at',
      desde: '2026-07-01',
      hasta: '2026-07-11',
    });
    expect(resultado).toEqual([gastos[0]]);
  });

  it('incluye gastos del último día del rango (límite superior inclusivo pese al horario)', () => {
    const resultado = filtrarGastos(gastos, { ...FILTROS_BASE, desde: '2026-07-20', hasta: '2026-07-20' });
    expect(resultado).toEqual([gastos[1]]);
  });

  it('combina varios filtros a la vez', () => {
    const resultado = filtrarGastos(gastos, {
      ...FILTROS_BASE,
      personaId: 'per1',
      categoriaId: 'cat1',
      desde: '2026-07-01',
      hasta: '2026-07-10',
    });
    expect(resultado).toEqual([gastos[0]]);
  });
});
