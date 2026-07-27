import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { CategoriaGasto } from '@/types/gasto';

export const categoriasGastoService = {
  async listar(): Promise<CategoriaGasto[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('categorias_gasto')
      .select('id, nombre, color')
      .order('nombre');

    throwOnSupabaseError(error, 'No se pudieron cargar las categorías de gasto');
    return data as CategoriaGasto[];
  },
};
