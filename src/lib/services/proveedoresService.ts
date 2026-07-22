import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Proveedor, ProveedorInput } from '@/types/proveedor';

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

type ProveedorRow = {
  id: string;
  nombre: string;
  url: string;
  compra_minima: number | null;
  whatsapp: string | null;
  created_at: string;
  proveedor_categorias: { categorias: { id: string; nombre: string } }[];
};

const SELECT_CON_CATEGORIAS = `
  id, nombre, url, compra_minima, whatsapp, created_at,
  proveedor_categorias ( categorias ( id, nombre ) )
`;

function mapRow(row: ProveedorRow): Proveedor {
  return {
    id: row.id,
    nombre: row.nombre,
    url: row.url,
    compraMinima: row.compra_minima,
    whatsapp: row.whatsapp,
    createdAt: row.created_at,
    categorias: row.proveedor_categorias.map((pc) => pc.categorias),
  };
}

async function asignarCategorias(
  supabase: SupabaseServerClient,
  proveedorId: string,
  categoriaIds: string[]
): Promise<void> {
  if (categoriaIds.length === 0) return;

  const { error } = await supabase
    .from('proveedor_categorias')
    .insert(categoriaIds.map((categoriaId) => ({ proveedor_id: proveedorId, categoria_id: categoriaId })));

  if (error) throw new Error(`No se pudieron asignar las categorías: ${error.message}`);
}

async function obtenerPorId(supabase: SupabaseServerClient, id: string): Promise<Proveedor> {
  const { data, error } = await supabase
    .from('proveedores')
    .select(SELECT_CON_CATEGORIAS)
    .eq('id', id)
    .single();

  if (error) throw new Error(`No se pudo leer el proveedor: ${error.message}`);
  return mapRow(data as unknown as ProveedorRow);
}

export const proveedoresService = {
  async listar(): Promise<Proveedor[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('proveedores')
      .select(SELECT_CON_CATEGORIAS)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`No se pudieron cargar los proveedores: ${error.message}`);
    return (data as unknown as ProveedorRow[]).map(mapRow);
  },

  async crear(input: ProveedorInput): Promise<Proveedor> {
    const supabase = createSupabaseServerClient();
    const { data: inserted, error: insertError } = await supabase
      .from('proveedores')
      .insert({
        nombre: input.nombre,
        url: input.url,
        compra_minima: input.compraMinima,
        whatsapp: input.whatsapp,
      })
      .select('id')
      .single();

    if (insertError) throw new Error(`No se pudo crear el proveedor: ${insertError.message}`);

    await asignarCategorias(supabase, (inserted as { id: string }).id, input.categoriaIds);
    return obtenerPorId(supabase, (inserted as { id: string }).id);
  },

  async actualizar(id: string, input: ProveedorInput): Promise<Proveedor> {
    const supabase = createSupabaseServerClient();
    const { error: updateError } = await supabase
      .from('proveedores')
      .update({
        nombre: input.nombre,
        url: input.url,
        compra_minima: input.compraMinima,
        whatsapp: input.whatsapp,
      })
      .eq('id', id);

    if (updateError) throw new Error(`No se pudo actualizar el proveedor: ${updateError.message}`);

    const { error: deleteError } = await supabase
      .from('proveedor_categorias')
      .delete()
      .eq('proveedor_id', id);

    if (deleteError) {
      throw new Error(`No se pudieron eliminar las categorías anteriores: ${deleteError.message}`);
    }

    await asignarCategorias(supabase, id, input.categoriaIds);

    return obtenerPorId(supabase, id);
  },

  async eliminar(id: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('proveedores').delete().eq('id', id);
    if (error) throw new Error(`No se pudo eliminar el proveedor: ${error.message}`);
  },
};
