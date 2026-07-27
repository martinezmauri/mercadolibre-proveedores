import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { CampoFechaGasto, FiltrosGasto, Gasto, GastoInput } from '@/types/gasto';

type GastoRow = {
  id: string;
  nombre: string;
  persona_id: string;
  categoria_id: string | null;
  monto: number;
  created_at: string;
  updated_at: string;
};

const SELECT_COLUMNAS = 'id, nombre, persona_id, categoria_id, monto, created_at, updated_at';

function mapRow(row: GastoRow): Gasto {
  return {
    id: row.id,
    nombre: row.nombre,
    personaId: row.persona_id,
    categoriaId: row.categoria_id,
    monto: row.monto,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: GastoInput) {
  return {
    nombre: input.nombre,
    persona_id: input.personaId,
    categoria_id: input.categoriaId,
    monto: input.monto,
  };
}

export const gastosService = {
  async listar(filtros?: Partial<FiltrosGasto>): Promise<Gasto[]> {
    const supabase = createSupabaseServerClient();
    let query = supabase.from('gastos').select(SELECT_COLUMNAS);

    if (filtros?.personaId) {
      query = query.eq('persona_id', filtros.personaId);
    }
    if (filtros?.categoriaId) {
      query = query.eq('categoria_id', filtros.categoriaId);
    }
    const campoFecha: CampoFechaGasto = filtros?.campoFecha ?? 'created_at';
    if (filtros?.desde) {
      query = query.gte(campoFecha, filtros.desde);
    }
    if (filtros?.hasta) {
      query = query.lte(campoFecha, filtros.hasta);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    throwOnSupabaseError(error, 'No se pudieron cargar los gastos');
    return (data as GastoRow[]).map(mapRow);
  },

  async crear(input: GastoInput): Promise<Gasto> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('gastos')
      .insert(toRow(input))
      .select(SELECT_COLUMNAS)
      .single();

    throwOnSupabaseError(error, 'No se pudo crear el gasto');
    return mapRow(data as GastoRow);
  },

  async actualizar(id: string, input: GastoInput): Promise<Gasto> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('gastos')
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT_COLUMNAS)
      .single();

    throwOnSupabaseError(error, 'No se pudo actualizar el gasto');
    return mapRow(data as GastoRow);
  },

  async eliminar(id: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error, count } = await supabase
      .from('gastos')
      .delete({ count: 'exact' })
      .eq('id', id);

    throwOnSupabaseError(error, 'No se pudo eliminar el gasto');
    if (count === 0) {
      throw new Error('El gasto ya no existe (probablemente ya fue eliminado por otra persona).');
    }
  },
};
