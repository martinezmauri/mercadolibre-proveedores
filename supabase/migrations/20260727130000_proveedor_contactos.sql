create table public.proveedor_contactos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  tipo text not null,
  valor text not null
);

alter table public.proveedor_contactos enable row level security;

alter table public.proveedores alter column url drop not null;
alter table public.proveedores add column notas text;

insert into public.proveedor_contactos (proveedor_id, tipo, valor)
select id, 'whatsapp', whatsapp
from public.proveedores
where whatsapp is not null;

alter table public.proveedores drop column whatsapp;

drop function if exists public.crear_proveedor(text, text, numeric, text, uuid[]);
drop function if exists public.actualizar_proveedor(uuid, text, text, numeric, text, uuid[]);

create or replace function public.crear_proveedor(
  p_nombre text,
  p_url text,
  p_compra_minima numeric,
  p_notas text,
  p_categoria_ids uuid[],
  p_contactos jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.proveedores (nombre, url, compra_minima, notas)
  values (p_nombre, p_url, p_compra_minima, p_notas)
  returning id into v_id;

  if p_categoria_ids is not null and array_length(p_categoria_ids, 1) is not null then
    insert into public.proveedor_categorias (proveedor_id, categoria_id)
    select v_id, unnest(p_categoria_ids);
  end if;

  if p_contactos is not null and jsonb_array_length(p_contactos) > 0 then
    insert into public.proveedor_contactos (proveedor_id, tipo, valor)
    select v_id, contacto.tipo, contacto.valor
    from jsonb_to_recordset(p_contactos) as contacto(tipo text, valor text);
  end if;

  return v_id;
end;
$$;

create or replace function public.actualizar_proveedor(
  p_id uuid,
  p_nombre text,
  p_url text,
  p_compra_minima numeric,
  p_notas text,
  p_categoria_ids uuid[],
  p_contactos jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.proveedores
  set nombre = p_nombre, url = p_url, compra_minima = p_compra_minima, notas = p_notas
  where id = p_id;

  delete from public.proveedor_categorias where proveedor_id = p_id;

  if p_categoria_ids is not null and array_length(p_categoria_ids, 1) is not null then
    insert into public.proveedor_categorias (proveedor_id, categoria_id)
    select p_id, unnest(p_categoria_ids);
  end if;

  delete from public.proveedor_contactos where proveedor_id = p_id;

  if p_contactos is not null and jsonb_array_length(p_contactos) > 0 then
    insert into public.proveedor_contactos (proveedor_id, tipo, valor)
    select p_id, contacto.tipo, contacto.valor
    from jsonb_to_recordset(p_contactos) as contacto(tipo text, valor text);
  end if;
end;
$$;
