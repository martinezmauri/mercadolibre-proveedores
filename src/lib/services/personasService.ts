import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { Persona } from '@/types/gasto';

export const personasService = {
  async listar(): Promise<Persona[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('personas').select('id, nombre').order('nombre');

    throwOnSupabaseError(error, 'No se pudieron cargar las personas');
    return data as Persona[];
  },
};
