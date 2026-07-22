import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Categoria } from '@/types/proveedor';

export const categoriasService = {
  async listar(): Promise<Categoria[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('categorias').select('id, nombre').order('nombre');

    if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
    return data as Categoria[];
  },
};
