import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { Categoria, Contacto, Proveedor, ProveedorInput } from '@/types/proveedor';

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

type ProveedorRow = {
  id: string;
  nombre: string;
  url: string | null;
  compra_minima: number | null;
  notas: string | null;
  created_at: string;
  proveedor_categorias: { categorias: Categoria }[];
  proveedor_contactos: Contacto[];
};

const SELECT_CON_CATEGORIAS = `
  id, nombre, url, compra_minima, notas, created_at,
  proveedor_categorias ( categorias ( id, nombre, color ) ),
  proveedor_contactos ( id, tipo, valor )
`;

function mapRow(row: ProveedorRow): Proveedor {
  return {
    id: row.id,
    nombre: row.nombre,
    url: row.url,
    compraMinima: row.compra_minima,
    notas: row.notas,
    createdAt: row.created_at,
    categorias: row.proveedor_categorias.map((pc) => pc.categorias),
    contactos: row.proveedor_contactos,
  };
}

async function obtenerPorId(supabase: SupabaseServerClient, id: string): Promise<Proveedor> {
  const { data, error } = await supabase
    .from('proveedores')
    .select(SELECT_CON_CATEGORIAS)
    .eq('id', id)
    .single();

  throwOnSupabaseError(error, 'No se pudo leer el proveedor');
  return mapRow(data as unknown as ProveedorRow);
}

export const proveedoresService = {
  async listar(): Promise<Proveedor[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('proveedores')
      .select(SELECT_CON_CATEGORIAS)
      .order('created_at', { ascending: false });

    throwOnSupabaseError(error, 'No se pudieron cargar los proveedores');
    return (data as unknown as ProveedorRow[]).map(mapRow);
  },

  async buscar({
    pagina,
    tamañoPagina,
    busqueda,
    categoriaId,
  }: {
    pagina: number;
    tamañoPagina: number;
    busqueda: string | null;
    categoriaId: string | null;
  }): Promise<{ proveedores: Proveedor[]; total: number }> {
    const supabase = createSupabaseServerClient();
    const desde = (pagina - 1) * tamañoPagina;
    const hasta = desde + tamañoPagina - 1;

    let idsPorCategoria: string[] | null = null;
    if (categoriaId) {
      const { data, error } = await supabase
        .from('proveedor_categorias')
        .select('proveedor_id')
        .eq('categoria_id', categoriaId);

      throwOnSupabaseError(error, 'No se pudieron buscar los proveedores');
      idsPorCategoria = (data ?? []).map((fila: { proveedor_id: string }) => fila.proveedor_id);
    }

    let query = supabase
      .from('proveedores')
      .select(SELECT_CON_CATEGORIAS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(desde, hasta);

    if (busqueda) {
      query = query.ilike('nombre', `%${busqueda}%`);
    }

    if (idsPorCategoria !== null) {
      query = query.in('id', idsPorCategoria);
    }

    const { data, error, count } = await query;

    throwOnSupabaseError(error, 'No se pudieron buscar los proveedores');
    return {
      proveedores: (data as unknown as ProveedorRow[]).map(mapRow),
      total: count ?? 0,
    };
  },

  async crear(input: ProveedorInput): Promise<Proveedor> {
    const supabase = createSupabaseServerClient();
    const { data: id, error } = await supabase.rpc('crear_proveedor', {
      p_nombre: input.nombre,
      p_url: input.url,
      p_compra_minima: input.compraMinima,
      p_notas: input.notas,
      p_categoria_ids: input.categoriaIds,
      p_contactos: input.contactos,
    });

    throwOnSupabaseError(error, 'No se pudo crear el proveedor');
    return obtenerPorId(supabase, id as string);
  },

  async actualizar(id: string, input: ProveedorInput): Promise<Proveedor> {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc('actualizar_proveedor', {
      p_id: id,
      p_nombre: input.nombre,
      p_url: input.url,
      p_compra_minima: input.compraMinima,
      p_notas: input.notas,
      p_categoria_ids: input.categoriaIds,
      p_contactos: input.contactos,
    });

    throwOnSupabaseError(error, 'No se pudo actualizar el proveedor');
    return obtenerPorId(supabase, id);
  },

  async eliminar(id: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error, count } = await supabase
      .from('proveedores')
      .delete({ count: 'exact' })
      .eq('id', id);

    throwOnSupabaseError(error, 'No se pudo eliminar el proveedor');
    if (count === 0) throw new Error('El proveedor ya no existe (probablemente ya fue eliminado por otra persona).');
  },
};
