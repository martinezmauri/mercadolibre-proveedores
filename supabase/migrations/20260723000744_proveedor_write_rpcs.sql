create or replace function public.crear_proveedor(
  p_nombre text,
  p_url text,
  p_compra_minima numeric,
  p_whatsapp text,
  p_categoria_ids uuid[]
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
begin
  insert into public.proveedores (nombre, url, compra_minima, whatsapp)
  values (p_nombre, p_url, p_compra_minima, p_whatsapp)
  returning id into v_id;

  if p_categoria_ids is not null and array_length(p_categoria_ids, 1) is not null then
    insert into public.proveedor_categorias (proveedor_id, categoria_id)
    select v_id, unnest(p_categoria_ids);
  end if;

  return v_id;
end;
$$;

create or replace function public.actualizar_proveedor(
  p_id uuid,
  p_nombre text,
  p_url text,
  p_compra_minima numeric,
  p_whatsapp text,
  p_categoria_ids uuid[]
) returns void
language plpgsql
security invoker
as $$
begin
  update public.proveedores
  set nombre = p_nombre, url = p_url, compra_minima = p_compra_minima, whatsapp = p_whatsapp
  where id = p_id;

  delete from public.proveedor_categorias where proveedor_id = p_id;

  if p_categoria_ids is not null and array_length(p_categoria_ids, 1) is not null then
    insert into public.proveedor_categorias (proveedor_id, categoria_id)
    select p_id, unnest(p_categoria_ids);
  end if;
end;
$$;
