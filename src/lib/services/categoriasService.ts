import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { Categoria } from '@/types/proveedor';

export const categoriasService = {
  async listar(): Promise<Categoria[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('categorias').select('id, nombre').order('nombre');

    throwOnSupabaseError(error, 'No se pudieron cargar las categorías');
    return data as Categoria[];
  },
};
