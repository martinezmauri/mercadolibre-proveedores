import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';
import type { Producto, ProductoInput } from '@/types/producto';

type ProductoRow = {
  id: string;
  proveedor_id: string;
  categoria_id: string | null;
  nombre: string;
  url: string;
  imagen_url: string | null;
  precio_menor: number | null;
  precio_mayor: number | null;
  created_at: string;
};

const SELECT_COLUMNAS =
  'id, proveedor_id, categoria_id, nombre, url, imagen_url, precio_menor, precio_mayor, created_at';

function mapRow(row: ProductoRow): Producto {
  return {
    id: row.id,
    proveedorId: row.proveedor_id,
    categoriaId: row.categoria_id,
    nombre: row.nombre,
    url: row.url,
    imagenUrl: row.imagen_url,
    precioMenor: row.precio_menor,
    precioMayor: row.precio_mayor,
    createdAt: row.created_at,
  };
}

function toRow(input: ProductoInput) {
  return {
    proveedor_id: input.proveedorId,
    categoria_id: input.categoriaId,
    nombre: input.nombre,
    url: input.url,
    imagen_url: input.imagenUrl,
    precio_menor: input.precioMenor,
    precio_mayor: input.precioMayor,
  };
}

export const productosService = {
  async listar(): Promise<Producto[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_COLUMNAS)
      .order('created_at', { ascending: false });

    throwOnSupabaseError(error, 'No se pudieron cargar los productos');
    return (data as ProductoRow[]).map(mapRow);
  },

  async crear(input: ProductoInput): Promise<Producto> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('productos')
      .insert(toRow(input))
      .select(SELECT_COLUMNAS)
      .single();

    throwOnSupabaseError(error, 'No se pudo crear el producto');
    return mapRow(data as ProductoRow);
  },

  async actualizar(id: string, input: ProductoInput): Promise<Producto> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('productos')
      .update(toRow(input))
      .eq('id', id)
      .select(SELECT_COLUMNAS)
      .single();

    throwOnSupabaseError(error, 'No se pudo actualizar el producto');
    return mapRow(data as ProductoRow);
  },

  async eliminar(id: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error, count } = await supabase
      .from('productos')
      .delete({ count: 'exact' })
      .eq('id', id);

    throwOnSupabaseError(error, 'No se pudo eliminar el producto');
    if (count === 0) {
      throw new Error('El producto ya no existe (probablemente ya fue eliminado por otra persona).');
    }
  },
};
